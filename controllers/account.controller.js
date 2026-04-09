/**
 * controllers/account.controller.js
 * Company/Account management with full CRUD and pagination.
 */

const Account = require('../models/account.model');
const Contact = require('../models/contact.model');
const Lead = require('../models/lead.model');
const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');
const logger = require('../config/logger');

exports.createAccount = async (req, res) => {
  try {
    const account = await Account.create({
      ...req.body,
      organizationId: req.user.organizationId,
      assignedTo: req.body.assignedTo || req.user.id,
    });

    res.status(201).json({ success: true, message: 'Account created successfully', account });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    logger.error('Create account error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllAccounts = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);
    const match = { isDeleted: { $ne: true }, ...filter };

    if (req.query.industry) match.industry = req.query.industry;
    if (req.query.size) match.size = req.query.size;
    if (req.query.city) match.city = new RegExp(req.query.city, 'i');
    if (req.user.organizationId) match.organizationId = req.user.organizationId;

    const accounts = await Account.find(match)
      .populate('assignedTo', 'name email')
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(accounts, limit) });
  } catch (err) {
    logger.error('Get accounts error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('assignedTo', 'name email');

    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    // Fetch associated contacts and leads counts
    const [contactCount, leadCount, openLeadValue] = await Promise.all([
      Contact.countDocuments({ accountId: account._id, isDeleted: { $ne: true } }),
      Lead.countDocuments({ accountId: account._id, isDeleted: { $ne: true } }),
      Lead.aggregate([
        { $match: { accountId: account._id, stage: { $nin: ['CLOSED_WON', 'CLOSED_LOST'] }, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      account,
      stats: {
        contactCount,
        leadCount,
        openPipelineValue: openLeadValue[0]?.total || 0,
      },
    });
  } catch (err) {
    logger.error('Get account error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    res.status(200).json({ success: true, message: 'Account updated', account });
  } catch (err) {
    logger.error('Update account error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (err) {
    logger.error('Delete account error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all contacts under an account
exports.getAccountContacts = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const contacts = await Contact.find({
      accountId: req.params.id,
      isDeleted: { $ne: true },
      ...filter,
    })
      .populate('assignedTo', 'name email')
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(contacts, limit) });
  } catch (err) {
    logger.error('Get account contacts error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all leads for an account
exports.getAccountLeads = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const leads = await Lead.find({
      accountId: req.params.id,
      isDeleted: { $ne: true },
      ...filter,
    })
      .populate('contactId', 'firstName lastName email')
      .populate('assignedTo', 'name email')
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(leads, limit) });
  } catch (err) {
    logger.error('Get account leads error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
