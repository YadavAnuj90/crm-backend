/**
 * controllers/note.controller.js
 *
 * Notes can be attached to Contact, Lead, Ticket, or Account.
 * Each note can carry a follow-up reminder (sent via reminder.worker.js).
 * Pinned notes surface at the top of the timeline.
 */

const Note = require('../models/note.model');
const ContactActivity = require('../models/contactActivity.model');
const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');
const logger = require('../config/logger');

// ── Create ────────────────────────────────────────────────────────────────────

exports.createNote = async (req, res) => {
  try {
    const { content, contactId, leadId, ticketId, accountId,
      reminderAt, reminderAssignedTo, isPinned } = req.body;

    // At least one entity must be referenced
    if (!contactId && !leadId && !ticketId && !accountId) {
      return res.status(400).json({
        success: false,
        message: 'Note must be attached to at least one entity (contactId, leadId, ticketId, or accountId)',
      });
    }

    const note = await Note.create({
      content, contactId, leadId, ticketId, accountId,
      reminderAt: reminderAt ? new Date(reminderAt) : null,
      reminderAssignedTo: reminderAssignedTo || req.user.id,
      isPinned: isPinned || false,
      authorId: req.user.id,
      organizationId: req.user.organizationId,
    });

    // Log to contact timeline if contactId provided
    if (contactId) {
      await ContactActivity.create({
        contactId,
        leadId: leadId || null,
        noteId: note._id,
        type: 'NOTE',
        direction: 'INTERNAL',
        title: isPinned ? '📌 Pinned note' : 'Note added',
        body: content.length > 150 ? content.substring(0, 150) + '...' : content,
        metadata: { reminderAt: reminderAt || null },
        performedBy: req.user.id,
        performedAt: new Date(),
        organizationId: req.user.organizationId,
      });
    }

    res.status(201).json({ success: true, message: 'Note created', note });
  } catch (err) {
    logger.error('Create note error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── List Notes (for an entity) ────────────────────────────────────────────────

exports.getNotes = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    // Build entity filter from query params
    const entityFilter = { isDeleted: { $ne: true }, ...filter };
    if (req.query.contactId) entityFilter.contactId = req.query.contactId;
    if (req.query.leadId) entityFilter.leadId = req.query.leadId;
    if (req.query.ticketId) entityFilter.ticketId = req.query.ticketId;
    if (req.query.accountId) entityFilter.accountId = req.query.accountId;
    if (req.user.organizationId) entityFilter.organizationId = req.user.organizationId;

    // Pinned notes first, then newest
    const notes = await Note.find(entityFilter)
      .populate('authorId', 'name email avatar')
      .populate('reminderAssignedTo', 'name email')
      .sort({ isPinned: -1, _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(notes, limit) });
  } catch (err) {
    logger.error('Get notes error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────

exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    // Only author or admin can edit
    if (note.authorId.toString() !== req.user.id.toString() && req.user.userType !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the note author can edit this note' });
    }

    const { content, reminderAt, reminderAssignedTo, isPinned } = req.body;
    if (content !== undefined) note.content = content;
    if (reminderAt !== undefined) {
      note.reminderAt = reminderAt ? new Date(reminderAt) : null;
      note.isReminderSent = false; // Reset so it fires again
    }
    if (reminderAssignedTo !== undefined) note.reminderAssignedTo = reminderAssignedTo;
    if (isPinned !== undefined) note.isPinned = isPinned;

    await note.save();

    res.status(200).json({ success: true, message: 'Note updated', note });
  } catch (err) {
    logger.error('Update note error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Delete (soft) ─────────────────────────────────────────────────────────────

exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    if (note.authorId.toString() !== req.user.id.toString() && req.user.userType !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the note author can delete this note' });
    }

    note.isDeleted = true;
    note.deletedAt = new Date();
    await note.save();

    res.status(200).json({ success: true, message: 'Note deleted' });
  } catch (err) {
    logger.error('Delete note error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Upcoming Reminders for current user ───────────────────────────────────────

exports.getMyReminders = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const reminders = await Note.find({
      reminderAssignedTo: req.user.id,
      reminderAt: { $gte: new Date() },
      isReminderSent: false,
      isDeleted: { $ne: true },
      ...filter,
    })
      .populate('contactId', 'firstName lastName email')
      .populate('leadId', 'title stage')
      .populate('ticketId', 'title ticketStatus')
      .sort({ reminderAt: 1 })  // Soonest first
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(reminders, limit) });
  } catch (err) {
    logger.error('Get reminders error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
