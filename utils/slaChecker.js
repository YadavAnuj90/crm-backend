const Ticket = require('../models/ticket.model');
const User = require('../models/user.model');
const { sendEmail } = require('./email');
const { notifyUser } = require('./notify');
const { dispatchWebhook } = require('./webhookDispatcher');
const logger = require('../config/logger');

async function checkSla() {
  try {
    const now = new Date();
    const overdueTickets = await Ticket.find({
      slaDueAt: { $lte: now },
      isOverdue: false,
      ticketStatus: { $in: ["OPEN", "IN_PROGRESS"] }
    });

    for (const ticket of overdueTickets) {
      ticket.isOverdue = true;
      await ticket.save();

      // Notify assigned engineer
      if (ticket.assignedTo) {
        const engineer = await User.findOne({ userId: ticket.assignedTo });
        if (engineer) {
          await sendEmail(
            engineer.email,
            `SLA Breach: Ticket #${ticket._id}`,
            `Ticket "${ticket.title}" has breached its SLA deadline. Please resolve it immediately.`
          );
          await notifyUser(engineer.userId, 'SLA Breach', `Ticket "${ticket.title}" is overdue!`);
        }
      }

      // Dispatch webhook
      await dispatchWebhook('ticket.overdue', { ticketId: ticket._id, title: ticket.title });

      logger.warn(`SLA breach: ticket ${ticket._id} - "${ticket.title}"`);
    }

    if (overdueTickets.length > 0) {
      logger.warn(`${overdueTickets.length} tickets marked overdue`);
    }
  } catch (err) {
    logger.error('SLA check error: ' + err.message);
  }
}

// Escalation: every 2 hours, escalate tickets overdue for more than 2/4/8 hours
async function escalateSlaBreaches() {
  try {
    const now = new Date();
    const tickets = await Ticket.find({
      isOverdue: true,
      ticketStatus: { $in: ["OPEN", "IN_PROGRESS"] },
      escalationLevel: { $lt: 3 }
    });

    for (const ticket of tickets) {
      const overdueHours = (now - ticket.slaDueAt) / (1000 * 60 * 60);
      const thresholds = [2, 4, 8]; // hours after SLA breach for each escalation level
      const newLevel = thresholds.filter(h => overdueHours >= h).length;

      if (newLevel > ticket.escalationLevel) {
        ticket.escalationLevel = newLevel;
        ticket.lastEscalatedAt = now;
        await ticket.save();

        logger.warn(`Ticket ${ticket._id} escalated to level ${newLevel}`);

        // Find admins to notify
        const admins = await User.find({ userType: 'ADMIN' });
        for (const admin of admins) {
          await sendEmail(
            admin.email,
            `Escalation Level ${newLevel}: Ticket "${ticket.title}"`,
            `Ticket "${ticket.title}" (ID: ${ticket._id}) has been overdue for ${overdueHours.toFixed(1)} hours. Escalation level: ${newLevel}/3.`
          );
        }
      }
    }
  } catch (err) {
    logger.error('SLA escalation error: ' + err.message);
  }
}

function startSlaScheduler() {
  // Use setInterval instead of node-cron since it's not installed
  // Check SLA every 5 minutes
  setInterval(() => {
    checkSla();
  }, 5 * 60 * 1000);

  // Escalate every 2 hours
  setInterval(() => {
    escalateSlaBreaches();
  }, 2 * 60 * 60 * 1000);

  logger.info('SLA scheduler started (using setInterval)');
}

module.exports = { checkSla, startSlaScheduler };
