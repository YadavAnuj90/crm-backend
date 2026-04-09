/**
 * queues/workers/reminder.worker.js
 *
 * Processes follow-up reminders from two sources:
 *   1. Note.reminderAt — standalone notes with scheduled reminders
 *   2. Lead.followUps[].remindAt — follow-ups embedded in leads
 *
 * This worker runs as a repeatable BullMQ job every 5 minutes.
 * For each due reminder it:
 *   - Sends an in-app notification to the assignee
 *   - Queues an email (non-blocking via email queue)
 *   - Marks the reminder as sent so it never fires twice
 */

const { Worker } = require('bullmq');
const { connection, queueEmail } = require('../index');
const Note = require('../../models/note.model');
const Lead = require('../../models/lead.model');
const User = require('../../models/user.model');
const { notifyUser } = require('../../utils/notify');
const logger = require('../../config/logger');

// ── Process Note reminders ────────────────────────────────────────────────────

async function processNoteReminders() {
  const now = new Date();

  // Find all due, unsent note reminders
  const dueNotes = await Note.find({
    reminderAt: { $lte: now },
    isReminderSent: false,
    isDeleted: { $ne: true },
  })
    .populate('authorId', 'name email userId')
    .populate('reminderAssignedTo', 'name email userId')
    .populate('contactId', 'firstName lastName')
    .populate('leadId', 'title')
    .lean();

  if (!dueNotes.length) return;

  // Batch mark as sent FIRST to prevent double-firing on slow processing
  const ids = dueNotes.map((n) => n._id);
  await Note.updateMany({ _id: { $in: ids } }, { $set: { isReminderSent: true, reminderSentAt: now } });

  for (const note of dueNotes) {
    const assignee = note.reminderAssignedTo || note.authorId;
    if (!assignee) continue;

    const contextLabel = note.contactId
      ? `Contact: ${note.contactId.firstName} ${note.contactId.lastName || ''}`
      : note.leadId
      ? `Lead: ${note.leadId.title}`
      : 'General note';

    const preview = note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content;
    const subject = `⏰ Follow-up reminder: ${contextLabel}`;
    const body = `You have a follow-up reminder.\n\n${contextLabel}\n\nNote: ${preview}`;

    // In-app notification
    if (assignee.userId) {
      await notifyUser(assignee.userId, '⏰ Follow-up Reminder', `${contextLabel} — ${preview}`);
    }

    // Email (queued async)
    if (assignee.email) {
      await queueEmail(assignee.email, subject, body);
    }

    logger.info(`Note reminder sent for note ${note._id} → ${assignee.email}`);
  }
}

// ── Process Lead follow-up reminders ─────────────────────────────────────────

async function processLeadFollowUps() {
  const now = new Date();

  // Find leads with at least one due, unsent follow-up
  const leads = await Lead.find({
    'followUps.remindAt': { $lte: now },
    'followUps.isCompleted': false,
    'followUps.isReminderSent': false,
    isDeleted: { $ne: true },
  })
    .populate('assignedTo', 'name email userId')
    .lean();

  if (!leads.length) return;

  for (const lead of leads) {
    const dueFollowUps = lead.followUps.filter(
      (f) => !f.isCompleted && !f.isReminderSent && new Date(f.remindAt) <= now
    );

    if (!dueFollowUps.length) continue;

    // Batch mark this lead's due follow-ups as reminder sent
    const followUpIds = dueFollowUps.map((f) => f._id);
    await Lead.updateMany(
      { _id: lead._id, 'followUps._id': { $in: followUpIds } },
      { $set: { 'followUps.$[elem].isReminderSent': true, 'followUps.$[elem].reminderSentAt': now } },
      { arrayFilters: [{ 'elem._id': { $in: followUpIds } }] }
    );

    for (const followUp of dueFollowUps) {
      // Resolve assignee: follow-up.assignedTo → lead.assignedTo
      let assignee = null;
      if (followUp.assignedTo) {
        assignee = await User.findById(followUp.assignedTo).lean();
      } else if (lead.assignedTo) {
        assignee = lead.assignedTo; // already populated
      }

      if (!assignee) continue;

      const preview = followUp.note || `Follow-up on lead "${lead.title}"`;
      const subject = `⏰ Lead Follow-up: ${lead.title}`;
      const body = `You have a follow-up scheduled for lead "${lead.title}".\n\nNote: ${preview}`;

      if (assignee.userId) {
        await notifyUser(assignee.userId, '⏰ Lead Follow-up', `${lead.title} — ${preview}`);
      }
      if (assignee.email) {
        await queueEmail(assignee.email, subject, body);
      }

      logger.info(`Lead follow-up reminder sent for lead ${lead._id} → ${assignee.email}`);
    }
  }
}

// ── Worker registration ───────────────────────────────────────────────────────

function startReminderWorker() {
  const worker = new Worker(
    'reminder',
    async (job) => {
      await processNoteReminders();
      await processLeadFollowUps();
    },
    {
      connection,
      concurrency: 1, // Sequential to avoid double-sends
    }
  );

  worker.on('completed', (job) => {
    logger.info('Reminder job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error(`Reminder job failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error('Reminder worker error: ' + err.message);
  });

  logger.info('Reminder worker started');
  return worker;
}

module.exports = { startReminderWorker };
