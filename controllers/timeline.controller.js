/**
 * controllers/timeline.controller.js
 *
 * Unified activity timeline for a contact's profile.
 * Aggregates from ContactActivity, Notes, Tickets, Leads, and Payments
 * into a single chronological stream — cursor-paginated.
 *
 * This is what makes the CRM feel like a CRM.
 */

const ContactActivity = require('../models/contactActivity.model');
const Note = require('../models/note.model');
const Lead = require('../models/lead.model');
const Ticket = require('../models/ticket.model');
const Contact = require('../models/contact.model');
const { buildCursorQuery } = require('../middlewares/paginate');
const logger = require('../config/logger');

/**
 * GET /api/v1/contacts/:id/timeline
 * Returns the full timeline for a contact, newest first.
 * Supports ?type=CALL,NOTE to filter by activity type.
 * Supports cursor pagination via ?cursor=<lastId>&limit=20.
 */
exports.getContactTimeline = async (req, res) => {
  try {
    const contactId = req.params.id;

    // Validate contact exists
    const contact = await Contact.findOne({ _id: contactId, isDeleted: { $ne: true } }).lean();
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    const { limit } = buildCursorQuery(req);

    // Cursor for activity timeline uses performedAt (time-based) instead of _id
    const beforeDate = req.query.cursor ? new Date(req.query.cursor) : null;

    const match = { contactId: contact._id };
    if (beforeDate) match.performedAt = { $lt: beforeDate };
    if (req.query.type) {
      const types = req.query.type.split(',').map((t) => t.trim().toUpperCase());
      match.type = { $in: types };
    }

    const activities = await ContactActivity.find(match)
      .populate('performedBy', 'name email')
      .populate('leadId', 'title stage value')
      .populate('ticketId', 'title ticketStatus ticketPriority')
      .populate('noteId', 'content isPinned')
      .sort({ performedAt: -1 })
      .limit(limit)
      .lean();

    const hasMore = activities.length === limit;
    const nextCursor = hasMore
      ? activities[activities.length - 1].performedAt.toISOString()
      : null;

    res.status(200).json({
      success: true,
      contactId,
      data: activities,
      count: activities.length,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    logger.error('Get timeline error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/v1/contacts/:id/timeline
 * Manually log an activity on a contact's timeline.
 * e.g. "Had a phone call with John", "Sent a WhatsApp message".
 */
exports.logActivity = async (req, res) => {
  try {
    const { type, direction, title, body, metadata, performedAt } = req.body;

    const contact = await Contact.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    const activity = await ContactActivity.create({
      contactId: contact._id,
      leadId: req.body.leadId || null,
      ticketId: req.body.ticketId || null,
      type,
      direction: direction || 'INTERNAL',
      title,
      body: body || null,
      metadata: metadata || {},
      performedBy: req.user.id,
      performedAt: performedAt ? new Date(performedAt) : new Date(),
      organizationId: req.user.organizationId,
    });

    res.status(201).json({ success: true, message: 'Activity logged', activity });
  } catch (err) {
    logger.error('Log activity error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/v1/contacts/:id/timeline/summary
 * Returns a quick summary card: total calls, emails, tickets, last contact date.
 */
exports.getContactSummary = async (req, res) => {
  try {
    const contactId = req.params.id;

    const contact = await Contact.findOne({ _id: contactId, isDeleted: { $ne: true } }).lean();
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    const [summary, openLeads, openTickets] = await Promise.all([
      ContactActivity.aggregate([
        { $match: { contactId: contact._id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            lastAt: { $max: '$performedAt' },
          },
        },
      ]),
      Lead.countDocuments({
        contactId: contact._id,
        stage: { $nin: ['CLOSED_WON', 'CLOSED_LOST'] },
        isDeleted: { $ne: true },
      }),
      Ticket.countDocuments({
        reportedBy: contact._id.toString(),
        ticketStatus: { $in: ['OPEN', 'IN_PROGRESS'] },
        isDeleted: { $ne: true },
      }),
    ]);

    const activityMap = {};
    let lastContactedAt = null;
    for (const s of summary) {
      activityMap[s._id] = { count: s.count, lastAt: s.lastAt };
      if (!lastContactedAt || s.lastAt > lastContactedAt) {
        lastContactedAt = s.lastAt;
      }
    }

    res.status(200).json({
      success: true,
      contactId,
      summary: {
        activities: activityMap,
        openLeads,
        openTickets,
        lastContactedAt,
        totalInteractions: summary.reduce((acc, s) => acc + s.count, 0),
      },
    });
  } catch (err) {
    logger.error('Get contact summary error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
