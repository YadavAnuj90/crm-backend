const Ticket = require('../models/ticket.model');
const User = require('../models/user.model');
const constants = require('../utils/constants');
const { logActivity } = require('../utils/activityLogger');
const { sendEmail } = require('../utils/email');
const { notifyUser } = require('../utils/notify');
const { buildCursorQuery, buildCursorResponse } = require('../middlewares/paginate');

function getSlaExpiry(priority) {
  const now = new Date();
  if (priority === 'CRITICAL') now.setHours(now.getHours() + 1);
  else if (priority === 'HIGH') now.setHours(now.getHours() + 4);
  else if (priority === 'MEDIUM') now.setHours(now.getHours() + 24);
  else now.setHours(now.getHours() + 48); // LOW
  return now;
}

// ── Create ────────────────────────────────────────────────────────────────────

exports.createTicket = async (req, res) => {
  const { title, description, priority, category, tags } = req.body;
  const files = req.files ? req.files.map((f) => f.path) : [];

  try {
    const ticket = await Ticket.create({
      title,
      description,
      ticketPriority: priority,
      ticketStatus: 'OPEN',
      category,
      tags,
      reportedBy: req.user.id,
      slaDueAt: getSlaExpiry(priority),
      attachments: files,
    });

    const user = await User.findById(req.user.id);

    // Non-blocking — all go into BullMQ queues
    sendEmail(user.email, 'Ticket Created', `Your ticket "${ticket.title}" was created successfully.`);
    notifyUser(user.userId, 'Ticket Created', `Your ticket "${ticket.title}" was created successfully.`);
    logActivity(ticket._id, req.user.id, 'TICKET_CREATED', null, `Ticket created with priority ${priority}`);

    res.status(201).json({ success: true, message: 'Ticket created successfully', ticket });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── List (cursor-paginated) ───────────────────────────────────────────────────

exports.getAllTickets = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const match = { isDeleted: { $ne: true }, ...filter };
    if (req.query.status) match.ticketStatus = req.query.status;
    if (req.query.priority) match.ticketPriority = req.query.priority;
    if (req.query.category) match.category = req.query.category;
    if (req.query.assignedTo) match.assignedTo = req.query.assignedTo;

    const tickets = await Ticket.find(match).sort({ _id: -1 }).limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(tickets, limit) });
  } catch (err) {
    console.error('Get all tickets error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const tickets = await Ticket.find({
      reportedBy: req.user.id,
      isDeleted: { $ne: true },
      ...filter,
    })
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(tickets, limit) });
  } catch (err) {
    console.error('Get my tickets error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getTicketsForEngineer = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const tickets = await Ticket.find({
      assignedTo: req.user.id,
      isDeleted: { $ne: true },
      ...filter,
    })
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({ success: true, ...buildCursorResponse(tickets, limit) });
  } catch (err) {
    console.error('Engineer ticket error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Assign ────────────────────────────────────────────────────────────────────

exports.assignTicket = async (req, res) => {
  const ticketId = req.params.id;
  const { engineerId } = req.body;

  try {
    const engineer = await User.findOne({ userId: engineerId });
    if (!engineer) return res.status(404).json({ message: 'Engineer not found' });

    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: { $ne: true } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const previousAssigned = ticket.assignedTo || 'None';
    ticket.assignedTo = engineerId;
    ticket.ticketStatus = 'IN_PROGRESS';
    await ticket.save();

    sendEmail(engineer.email, 'New Ticket Assigned', `Ticket "${ticket.title}" is assigned to you.`);
    notifyUser(engineer.userId, 'New Ticket Assigned', `Ticket "${ticket.title}" is assigned to you.`);
    logActivity(ticket._id, req.user.id, 'TICKET_ASSIGNED', `Previous: ${previousAssigned}`, `Assigned to: ${engineerId}`);

    res.status(200).json({ success: true, message: 'Ticket assigned successfully', ticket });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Status Update ─────────────────────────────────────────────────────────────

exports.updateStatus = async (req, res) => {
  const ticketId = req.params.id;
  const { ticketStatus } = req.body; // validated by Zod

  try {
    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: { $ne: true } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.ticketStatus;

    if (ticketStatus === 'RESOLVED') {
      ticket.isOverdue = false;
    } else if (['OPEN', 'IN_PROGRESS'].includes(ticketStatus)) {
      if (ticket.slaDueAt && ticket.slaDueAt < new Date()) {
        ticket.isOverdue = true;
      }
    }

    ticket.ticketStatus = ticketStatus;
    await ticket.save();

    const customer = await User.findById(ticket.reportedBy);
    if (customer?.email) {
      sendEmail(customer.email, 'Ticket Status Updated', `Your ticket "${ticket.title}" is now "${ticketStatus}".`);
    }
    if (customer?.userId) {
      notifyUser(customer.userId, 'Ticket Status Updated', `Your ticket "${ticket.title}" is now "${ticketStatus}".`);
    }

    logActivity(ticket._id, req.user.id, 'STATUS_UPDATED', `Old: ${oldStatus}`, `New: ${ticketStatus}`);

    return res.status(200).json({ success: true, message: 'Ticket status updated successfully', ticket });
  } catch (err) {
    console.error('Status update error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Attachments ───────────────────────────────────────────────────────────────

exports.addAttachment = async (req, res) => {
  const ticketId = req.params.id;

  try {
    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: { $ne: true } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const newFiles = req.files.map((file) => file.path);
    ticket.attachments.push(...newFiles);
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Attachments uploaded successfully',
      attachments: ticket.attachments,
    });
  } catch (err) {
    console.error('Attachment error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ── Feedback ──────────────────────────────────────────────────────────────────

exports.addFeedback = async (req, res) => {
  const ticketId = req.params.id;
  const { rating, feedback } = req.body; // validated by Zod

  try {
    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: { $ne: true } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (ticket.reportedBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not allowed to review this ticket' });
    }

    if (!['RESOLVED', 'CLOSED'].includes(ticket.ticketStatus)) {
      return res.status(400).json({ message: 'You can rate only RESOLVED or CLOSED tickets' });
    }

    ticket.rating = rating;
    ticket.feedback = feedback;
    await ticket.save();

    notifyUser(ticket.reportedBy, 'Feedback Submitted', `Feedback for your ticket "${ticket.title}" has been submitted.`);

    res.status(200).json({ success: true, message: 'Feedback submitted successfully', ticket });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Bulk Operations ───────────────────────────────────────────────────────────

exports.bulkAssignTickets = async (req, res) => {
  const { ticketIds, engineerId } = req.body; // validated by Zod

  try {
    const engineer = await User.findOne({ userId: engineerId });
    if (!engineer) return res.status(404).json({ message: 'Engineer not found' });

    const result = await Ticket.updateMany(
      { _id: { $in: ticketIds }, isDeleted: { $ne: true } },
      { $set: { assignedTo: engineerId, ticketStatus: 'IN_PROGRESS' } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} tickets assigned`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.bulkUpdateStatus = async (req, res) => {
  const { ticketIds, ticketStatus } = req.body; // validated by Zod

  try {
    const result = await Ticket.updateMany(
      { _id: { $in: ticketIds }, isDeleted: { $ne: true } },
      { $set: { ticketStatus } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} tickets updated`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Soft Delete & Restore (Fix #6) ────────────────────────────────────────────

exports.softDeleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const RETENTION_DAYS = parseInt(process.env.SOFT_DELETE_RETENTION_DAYS || '30', 10);

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    ticket.deletedBy = req.user.id;
    ticket.permanentDeleteAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await ticket.save();

    logActivity(
      ticket._id,
      req.user.id,
      'TICKET_DELETED',
      null,
      `Soft deleted. Permanent deletion after ${RETENTION_DAYS} days.`
    );

    res.status(200).json({
      success: true,
      message: `Ticket soft-deleted. It will be permanently removed after ${RETENTION_DAYS} days.`,
      permanentDeleteAt: ticket.permanentDeleteAt,
    });
  } catch (err) {
    console.error('Soft delete error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.restoreTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: true });
    if (!ticket) return res.status(404).json({ message: 'Deleted ticket not found' });

    ticket.isDeleted = false;
    ticket.deletedAt = null;
    ticket.deletedBy = null;
    ticket.permanentDeleteAt = null;
    await ticket.save();

    logActivity(ticket._id, req.user.id, 'TICKET_RESTORED', null, 'Ticket restored from recycle bin');

    res.status(200).json({ success: true, message: 'Ticket restored successfully', ticket });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDeletedTickets = async (req, res) => {
  try {
    const { filter, limit } = buildCursorQuery(req);

    const tickets = await Ticket.find({
      isDeleted: true,
      ...filter,
    })
      .sort({ _id: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Deleted tickets (recycle bin)',
      ...buildCursorResponse(tickets, limit),
    });
  } catch (err) {
    console.error('Get deleted tickets error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
