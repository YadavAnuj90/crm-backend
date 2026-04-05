/**
 * queues/workers/sla.worker.js
 *
 * Replaces the fragile setInterval-based scheduler.
 * BullMQ persists repeatable jobs in Redis, so server restarts never lose the schedule.
 *
 * Job types:
 *  - 'check'    → mark newly-overdue tickets, notify engineers
 *  - 'escalate' → escalate tickets that have been overdue for 2/4/8 hours
 */

const { Worker } = require('bullmq');
const { connection } = require('../index');
const { queueEmail } = require('../index');
const { queueWebhook } = require('../index');
const Ticket = require('../../models/ticket.model');
const User = require('../../models/user.model');
const Webhook = require('../../models/webhook.model');
const { notifyUser } = require('../../utils/notify');
const logger = require('../../config/logger');

// ── SLA Check ─────────────────────────────────────────────────────────────────

async function runSlaCheck() {
  const now = new Date();

  const overdueTickets = await Ticket.find({
    slaDueAt: { $lte: now },
    isOverdue: false,
    ticketStatus: { $in: ['OPEN', 'IN_PROGRESS'] },
    isDeleted: { $ne: true },
  }).lean();

  if (!overdueTickets.length) return;

  // Bulk mark overdue first to avoid race conditions on next run
  const ids = overdueTickets.map((t) => t._id);
  await Ticket.updateMany({ _id: { $in: ids } }, { $set: { isOverdue: true } });

  for (const ticket of overdueTickets) {
    // Notify assigned engineer
    if (ticket.assignedTo) {
      const engineer = await User.findOne({ userId: ticket.assignedTo }).lean();
      if (engineer) {
        await queueEmail(
          engineer.email,
          `SLA Breach: Ticket #${ticket._id}`,
          `Ticket "${ticket.title}" has breached its SLA deadline. Please resolve it immediately.`
        );
        await notifyUser(
          engineer.userId,
          'SLA Breach',
          `Ticket "${ticket.title}" is overdue!`
        );
      }
    }

    // Dispatch webhook for all org webhooks subscribed to ticket.overdue
    const webhooks = await Webhook.find({
      events: 'ticket.overdue',
      isActive: true,
      organizationId: ticket.organizationId,
    }).lean();

    for (const wh of webhooks) {
      await queueWebhook(wh._id, wh.url, wh.secret, 'ticket.overdue', {
        ticketId: ticket._id,
        title: ticket.title,
      });
    }

    logger.warn(`SLA breach: ticket ${ticket._id} — "${ticket.title}"`);
  }

  logger.warn(`${overdueTickets.length} tickets marked overdue`);
}

// ── Escalation ────────────────────────────────────────────────────────────────

async function runEscalation() {
  const now = new Date();

  const tickets = await Ticket.find({
    isOverdue: true,
    ticketStatus: { $in: ['OPEN', 'IN_PROGRESS'] },
    escalationLevel: { $lt: 3 },
    isDeleted: { $ne: true },
  }).lean();

  if (!tickets.length) return;

  const admins = await User.find({ userType: 'ADMIN' }).lean();

  for (const ticket of tickets) {
    const overdueHours = (now - new Date(ticket.slaDueAt)) / (1000 * 60 * 60);
    const thresholds = [2, 4, 8]; // hours past SLA breach per escalation level
    const newLevel = thresholds.filter((h) => overdueHours >= h).length;

    if (newLevel <= ticket.escalationLevel) continue;

    await Ticket.findByIdAndUpdate(ticket._id, {
      escalationLevel: newLevel,
      lastEscalatedAt: now,
    });

    logger.warn(`Ticket ${ticket._id} escalated to level ${newLevel}`);

    for (const admin of admins) {
      await queueEmail(
        admin.email,
        `Escalation Level ${newLevel}: Ticket "${ticket.title}"`,
        `Ticket "${ticket.title}" (ID: ${ticket._id}) has been overdue for ${overdueHours.toFixed(1)} hours. Escalation level: ${newLevel}/3.`
      );
    }
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────

function startSlaWorker() {
  const worker = new Worker(
    'sla',
    async (job) => {
      if (job.data.type === 'check') {
        await runSlaCheck();
      } else if (job.data.type === 'escalate') {
        await runEscalation();
      }
    },
    {
      connection,
      concurrency: 1, // SLA jobs are sequential to prevent race conditions
    }
  );

  worker.on('completed', (job) => {
    logger.info(`SLA job completed: ${job.name}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`SLA job ${job?.name} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error('SLA worker error: ' + err.message);
  });

  logger.info('SLA worker started');
  return worker;
}

module.exports = { startSlaWorker };
