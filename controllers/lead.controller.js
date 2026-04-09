/**
 * controllers/lead.controller.js
 * Full sales pipeline management: create, update stage, close won/lost,
 * pipeline board view, follow-up scheduling, analytics.
 */

const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Contact = require('../models/contact.model');
const ContactActivity = require('../models/contactActivity.model');
const { notifyUser } = require('../utils/notify');
const { sendEmail } = require('../utils/email');
const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');
const logger = require('../config/logger');

// ── Create Lead ───────────────────────────────────────────────────────────────

exports.createLead = async (req, res) => {
  try {
    const { title, contactId, accountId, source, stage, value, probability,
      expectedCloseDate, description, tags, assignedTo } = req.body;

    const lead = await Lead.create({
      title, contactId, accountId, source, stage: stage || 'NEW',
      value, probability, expectedCloseDate, description, tags, assignedTo,
      organizationId: req.user.organizationId,
      stageHistory: [{ stage: stage || 'NEW', enteredAt: new Date() }],
    });

    // Log activity on the contact's timeline
    if (contactId) {
      await ContactActivity.create({
        contactId,
        leadId: lead._id,
        type: 'LEAD_STAGE',
        direction: 'INTERNAL',
        title: `New lead created: "${title}"`,
        body: `Stage: NEW | Value: ₹${value || 0}`,
        performedBy: req.user.id,
        performedAt: new Date(),
        organizationId: req.user.organizationId,
      });
    }

    res.status(201).json({ success: true, message: 'Lead created successfully', lead });
  } catch (err) {
    logger.error('Create lead error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Get All Leads (Pipeline Board + List) ─────────────────────────────────────

exports.getAllLeads = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);
    const match = { isDeleted: { $ne: true }, ...filter };

    if (req.query.stage) match.stage = req.query.stage;
    if (req.query.assignedTo) match.assignedTo = new mongoose.Types.ObjectId(req.query.assignedTo);
    if (req.query.accountId) match.accountId = new mongoose.Types.ObjectId(req.query.accountId);
    if (req.query.source) match.source = req.query.source;
    if (req.user.organizationId) match.organizationId = req.user.organizationId;

    const leads = await Lead.find(match)
      .populate('contactId', 'firstName lastName email phone')
      .populate('accountId', 'name industry')
      .populate('assignedTo', 'name email')
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(leads, limit) });
  } catch (err) {
    logger.error('Get leads error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Pipeline Board (grouped by stage) ────────────────────────────────────────

exports.getPipelineBoard = async (req, res) => {
  try {
    const { PIPELINE_STAGES } = require('../models/lead.model');
    const orgFilter = req.user.organizationId ? { organizationId: req.user.organizationId } : {};

    const pipeline = await Lead.aggregate([
      { $match: { isDeleted: { $ne: true }, ...orgFilter } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          leads: {
            $push: {
              _id: '$_id', title: '$title', value: '$value',
              probability: '$probability', assignedTo: '$assignedTo',
              contactId: '$contactId', accountId: '$accountId',
              expectedCloseDate: '$expectedCloseDate', createdAt: '$createdAt',
            },
          },
        },
      },
    ]);

    // Normalize into ordered stage map
    const board = {};
    for (const stage of PIPELINE_STAGES) {
      const found = pipeline.find((p) => p._id === stage);
      board[stage] = {
        stage,
        count: found?.count || 0,
        totalValue: found?.totalValue || 0,
        leads: (found?.leads || []).slice(0, 50), // Cap per stage for board view
      };
    }

    res.status(200).json({ success: true, board });
  } catch (err) {
    logger.error('Pipeline board error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Get Single Lead ───────────────────────────────────────────────────────────

exports.getLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('contactId', 'firstName lastName email phone whatsapp')
      .populate('accountId', 'name industry size city')
      .populate('assignedTo', 'name email')
      .populate('followUps.assignedTo', 'name email');

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    res.status(200).json({ success: true, lead });
  } catch (err) {
    logger.error('Get lead error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Update Lead / Move Stage ──────────────────────────────────────────────────

exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const { stage, lostReason, ...rest } = req.body;
    const oldStage = lead.stage;

    // Enforce lostReason when closing as lost
    if (stage === 'CLOSED_LOST' && !lostReason && !lead.lostReason) {
      return res.status(400).json({ success: false, message: 'lostReason is required to close a lead as LOST' });
    }

    // Apply updates
    Object.assign(lead, rest);

    if (stage && stage !== oldStage) {
      lead.stage = stage;
      lead.stageHistory.push({ stage, enteredAt: new Date() });

      if (stage === 'CLOSED_WON') lead.wonAt = new Date();
      if (stage === 'CLOSED_LOST') {
        lead.lostAt = new Date();
        lead.lostReason = lostReason;
      }

      // Log stage change on contact timeline
      if (lead.contactId) {
        await ContactActivity.create({
          contactId: lead.contactId,
          leadId: lead._id,
          type: 'LEAD_STAGE',
          direction: 'INTERNAL',
          title: `Lead moved: ${oldStage} → ${stage}`,
          body: stage === 'CLOSED_LOST' ? `Lost reason: ${lostReason}` : null,
          performedBy: req.user.id,
          performedAt: new Date(),
          organizationId: req.user.organizationId,
        });
      }
    } else if (lostReason) {
      lead.lostReason = lostReason;
    }

    await lead.save();

    res.status(200).json({ success: true, message: 'Lead updated successfully', lead });
  } catch (err) {
    logger.error('Update lead error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Follow-up Management ──────────────────────────────────────────────────────

exports.addFollowUp = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const { note, remindAt, assignedTo } = req.body;

    lead.followUps.push({
      note,
      remindAt: new Date(remindAt),
      assignedTo: assignedTo || req.user.id,
    });

    await lead.save();

    const newFollowUp = lead.followUps[lead.followUps.length - 1];

    res.status(201).json({ success: true, message: 'Follow-up scheduled', followUp: newFollowUp });
  } catch (err) {
    logger.error('Add follow-up error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.completeFollowUp = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const followUp = lead.followUps.id(req.params.followUpId);
    if (!followUp) return res.status(404).json({ success: false, message: 'Follow-up not found' });

    followUp.isCompleted = true;
    followUp.completedAt = new Date();
    await lead.save();

    res.status(200).json({ success: true, message: 'Follow-up marked complete', followUp });
  } catch (err) {
    logger.error('Complete follow-up error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Pipeline Analytics ────────────────────────────────────────────────────────

exports.getPipelineAnalytics = async (req, res) => {
  try {
    const orgFilter = req.user.organizationId ? { organizationId: req.user.organizationId } : {};

    const [stageBreakdown, conversionFunnel, topAssignees] = await Promise.all([
      // Value + count by stage
      Lead.aggregate([
        { $match: { isDeleted: { $ne: true }, ...orgFilter } },
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 },
            totalValue: { $sum: '$value' },
            avgProbability: { $avg: '$probability' },
          },
        },
        { $sort: { totalValue: -1 } },
      ]),

      // Won vs Lost this month
      Lead.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            stage: { $in: ['CLOSED_WON', 'CLOSED_LOST'] },
            updatedAt: { $gte: new Date(new Date().setDate(1)) },
            ...orgFilter,
          },
        },
        { $group: { _id: '$stage', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
      ]),

      // Top performing assignees
      Lead.aggregate([
        { $match: { isDeleted: { $ne: true }, stage: 'CLOSED_WON', ...orgFilter } },
        { $group: { _id: '$assignedTo', wonCount: { $sum: 1 }, wonValue: { $sum: '$value' } } },
        { $sort: { wonValue: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmpty: true } },
        { $project: { wonCount: 1, wonValue: 1, 'user.name': 1, 'user.email': 1 } },
      ]),
    ]);

    res.status(200).json({ success: true, stageBreakdown, conversionFunnel, topAssignees });
  } catch (err) {
    logger.error('Pipeline analytics error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Soft Delete ───────────────────────────────────────────────────────────────

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    logger.error('Delete lead error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
