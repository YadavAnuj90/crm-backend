/**
 * controllers/contact.controller.js
 *
 * Unified contact management with:
 *  - Full CRUD + pagination + filtering
 *  - Deduplication detection and merge
 *  - Bulk import from Excel / CSV
 *  - Unified profile stats
 */

const mongoose = require('mongoose');
const Contact = require('../models/contact.model');
const ContactActivity = require('../models/contactActivity.model');
const Lead = require('../models/lead.model');
const Note = require('../models/note.model');
const Ticket = require('../models/ticket.model');
const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');
const { importContactsFromBuffer } = require('../services/contactImport.service');
const logger = require('../config/logger');

// ── Create ────────────────────────────────────────────────────────────────────

exports.createContact = async (req, res) => {
  try {
    // Deduplication check on email within the org
    if (req.body.email) {
      const existing = await Contact.findOne({
        email: req.body.email,
        organizationId: req.user.organizationId,
        isDeleted: { $ne: true },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A contact with this email already exists',
          existingContactId: existing._id,
        });
      }
    }

    const contact = await Contact.create({
      ...req.body,
      organizationId: req.user.organizationId,
      assignedTo: req.body.assignedTo || req.user.id,
    });

    // Log creation as first activity
    await ContactActivity.create({
      contactId: contact._id,
      type: 'SYSTEM',
      direction: 'INTERNAL',
      title: 'Contact created',
      body: `Created by ${req.user.email || 'system'}`,
      performedBy: req.user.id,
      performedAt: new Date(),
      organizationId: req.user.organizationId,
    });

    res.status(201).json({ success: true, message: 'Contact created successfully', contact });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Contact with this email already exists in your org' });
    }
    logger.error('Create contact error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── List (cursor-paginated) ───────────────────────────────────────────────────

exports.getAllContacts = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);
    const match = { isDeleted: { $ne: true }, isDuplicate: { $ne: true }, ...filter };

    if (req.query.status) match.status = req.query.status;
    if (req.query.source) match.source = req.query.source;
    if (req.query.accountId) match.accountId = new mongoose.Types.ObjectId(req.query.accountId);
    if (req.query.assignedTo) match.assignedTo = new mongoose.Types.ObjectId(req.query.assignedTo);
    if (req.user.organizationId) match.organizationId = req.user.organizationId;
    if (req.query.q) {
      // Full text search across name, email, phone
      match.$or = [
        { firstName: new RegExp(req.query.q, 'i') },
        { lastName: new RegExp(req.query.q, 'i') },
        { email: new RegExp(req.query.q, 'i') },
        { phone: new RegExp(req.query.q, 'i') },
      ];
    }

    const contacts = await Contact.find(match)
      .populate('accountId', 'name industry')
      .populate('assignedTo', 'name email')
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(contacts, limit) });
  } catch (err) {
    logger.error('Get contacts error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Unified Profile ───────────────────────────────────────────────────────────

exports.getContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('accountId', 'name industry size city')
      .populate('assignedTo', 'name email')
      .populate('duplicateOf', 'firstName lastName email');

    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    // Fetch summary stats in parallel
    const [leadCount, ticketCount, noteCount, lastActivity] = await Promise.all([
      Lead.countDocuments({ contactId: contact._id, isDeleted: { $ne: true } }),
      Ticket.countDocuments({ reportedBy: contact._id.toString(), isDeleted: { $ne: true } }),
      Note.countDocuments({ contactId: contact._id, isDeleted: { $ne: true } }),
      ContactActivity.findOne({ contactId: contact._id }).sort({ performedAt: -1 }).lean(),
    ]);

    res.status(200).json({
      success: true,
      contact,
      stats: { leadCount, ticketCount, noteCount, lastActivity },
    });
  } catch (err) {
    logger.error('Get contact error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    res.status(200).json({ success: true, message: 'Contact updated', contact });
  } catch (err) {
    logger.error('Update contact error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Deduplication ─────────────────────────────────────────────────────────────

exports.findDuplicates = async (req, res) => {
  try {
    const orgFilter = req.user.organizationId ? { organizationId: req.user.organizationId } : {};

    // Find contacts sharing the same email or phone number (likely duplicates)
    const emailDupes = await Contact.aggregate([
      { $match: { isDeleted: { $ne: true }, email: { $ne: null }, ...orgFilter } },
      { $group: { _id: '$email', count: { $sum: 1 }, contacts: { $push: { _id: '$_id', firstName: '$firstName', lastName: '$lastName', phone: '$phone', createdAt: '$createdAt' } } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    const phoneDupes = await Contact.aggregate([
      { $match: { isDeleted: { $ne: true }, phone: { $ne: null }, isDuplicate: { $ne: true }, ...orgFilter } },
      { $group: { _id: '$phone', count: { $sum: 1 }, contacts: { $push: { _id: '$_id', firstName: '$firstName', lastName: '$lastName', email: '$email', createdAt: '$createdAt' } } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    res.status(200).json({
      success: true,
      duplicates: {
        byEmail: emailDupes,
        byPhone: phoneDupes,
        totalGroups: emailDupes.length + phoneDupes.length,
      },
    });
  } catch (err) {
    logger.error('Find duplicates error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.mergeContacts = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { survivorId, duplicateId } = req.body;

    const [survivor, duplicate] = await Promise.all([
      Contact.findOne({ _id: survivorId, isDeleted: { $ne: true } }).session(session),
      Contact.findOne({ _id: duplicateId, isDeleted: { $ne: true } }).session(session),
    ]);

    if (!survivor || !duplicate) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'One or both contacts not found' });
    }

    // Merge: fill missing fields on survivor from duplicate
    const mergeFields = ['phone', 'alternatePhone', 'whatsapp', 'designation', 'department', 'accountId', 'company', 'tags'];
    for (const field of mergeFields) {
      if (!survivor[field] && duplicate[field]) {
        survivor[field] = duplicate[field];
      }
    }
    // Merge tags uniquely
    if (duplicate.tags?.length) {
      survivor.tags = [...new Set([...(survivor.tags || []), ...duplicate.tags])];
    }

    await survivor.save({ session });

    // Re-point all related records to the survivor
    await Promise.all([
      Lead.updateMany({ contactId: duplicateId }, { contactId: survivorId }, { session }),
      ContactActivity.updateMany({ contactId: duplicateId }, { contactId: survivorId }, { session }),
      Note.updateMany({ contactId: duplicateId }, { contactId: survivorId }, { session }),
    ]);

    // Flag duplicate as merged (soft-delete style)
    duplicate.isDuplicate = true;
    duplicate.duplicateOf = survivorId;
    duplicate.isDeleted = true;
    duplicate.deletedAt = new Date();
    await duplicate.save({ session });

    await session.commitTransaction();

    res.status(200).json({ success: true, message: 'Contacts merged successfully', survivorId });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Merge contacts error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};

// ── Bulk Import from Excel / CSV ──────────────────────────────────────────────

exports.importContacts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Send a .xlsx or .csv file.' });
    }

    const result = await importContactsFromBuffer(
      req.file.buffer,
      req.file.originalname,
      {
        organizationId: req.user.organizationId,
        assignedTo: req.user.id,
      }
    );

    res.status(200).json({
      success: true,
      message: `Import complete: ${result.created} created, ${result.duplicates} duplicates skipped, ${result.errors} errors`,
      summary: result,
    });
  } catch (err) {
    logger.error('Import contacts error: ' + err.message);
    res.status(500).json({ success: false, message: 'Import failed: ' + err.message });
  }
};

// ── Soft Delete ───────────────────────────────────────────────────────────────

exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    res.status(200).json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    logger.error('Delete contact error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
