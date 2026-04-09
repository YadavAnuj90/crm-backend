/**
 * controllers/emailInbox.controller.js
 *
 * API endpoints to manage and inspect the email inbox integration.
 */

const EmailThread = require('../models/emailThread.model');
const { pollInbox, isImapConfigured } = require('../services/emailInbox.service');
const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');
const logger = require('../config/logger');

// ── Status Check ──────────────────────────────────────────────────────────────

exports.getInboxStatus = async (req, res) => {
  const configured = isImapConfigured();

  const [totalThreads, processedToday, recentErrors] = await Promise.all([
    EmailThread.countDocuments({ direction: 'INBOUND' }),
    EmailThread.countDocuments({
      direction: 'INBOUND',
      receivedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    EmailThread.countDocuments({ isProcessed: false }),
  ]);

  res.status(200).json({
    success: true,
    status: {
      configured,
      imapHost: process.env.IMAP_HOST || null,
      imapUser: process.env.IMAP_USER ? `${process.env.IMAP_USER.substring(0, 3)}***` : null,
      totalInboundEmails: totalThreads,
      processedToday,
      pendingProcessing: recentErrors,
    },
  });
};

// ── List Email Threads ─────────────────────────────────────────────────────────

exports.listThreads = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);
    const match = { ...filter };

    if (req.query.direction) match.direction = req.query.direction;
    if (req.query.ticketId) match.ticketId = req.query.ticketId;
    if (req.query.contactId) match.contactId = req.query.contactId;

    const threads = await EmailThread.find(match)
      .populate('ticketId', 'title ticketStatus')
      .populate('contactId', 'firstName lastName email')
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(threads, limit) });
  } catch (err) {
    logger.error('List threads error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Get Thread for a Ticket ───────────────────────────────────────────────────

exports.getTicketThreads = async (req, res) => {
  try {
    const threads = await EmailThread.find({ ticketId: req.params.ticketId })
      .populate('contactId', 'firstName lastName email')
      .sort({ receivedAt: 1 }); // Oldest first for conversation order

    res.status(200).json({ success: true, data: threads, count: threads.length });
  } catch (err) {
    logger.error('Get ticket threads error: ' + err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Manual Poll Trigger (admin only) ─────────────────────────────────────────

exports.triggerPoll = async (req, res) => {
  if (!isImapConfigured()) {
    return res.status(400).json({ success: false, message: 'IMAP is not configured. Set IMAP_HOST, IMAP_USER, IMAP_PASS env vars.' });
  }

  // Run in background — don't await
  pollInbox().catch((err) => logger.error('Manual poll error: ' + err.message));

  res.status(202).json({ success: true, message: 'IMAP poll triggered. Check logs for results.' });
};
