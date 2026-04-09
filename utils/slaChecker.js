/**
 * utils/slaChecker.js
 *
 * Single startup point for ALL BullMQ workers and repeatable jobs.
 * Called once at server startup by server.js.
 *
 * Workers started here:
 *  - SLA breach check + escalation (every 5 min / 2 hr)
 *  - Email delivery (event-driven)
 *  - Webhook dispatch with retry (event-driven)
 *  - Note + Lead follow-up reminders (every 5 min)
 *  - IMAP inbox poll (every 5 min, if configured)
 */

const logger = require('../config/logger');

async function startSlaScheduler() {
  const { Queue } = require('bullmq');
  const { registerSlaJobs, connection, reminderQueue } = require('../queues/index');

  // ── Start all workers ─────────────────────────────────────────────────────
  const { startSlaWorker } = require('../queues/workers/sla.worker');
  const { startEmailWorker } = require('../queues/workers/email.worker');
  const { startWebhookWorker } = require('../queues/workers/webhook.worker');
  const { startReminderWorker } = require('../queues/workers/reminder.worker');
  const { startImapWorker } = require('../queues/workers/imap.worker');
  const { isImapConfigured } = require('../services/emailInbox.service');

  // ── Register all repeatable jobs (idempotent) ─────────────────────────────
  await registerSlaJobs(); // SLA check + escalation + reminder

  // ── Register IMAP repeatable job only if credentials are real ────────────
  const imapQueue = new Queue('imap', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });

  // Always clear stale repeatable jobs first
  const existingImapJobs = await imapQueue.getRepeatableJobs();
  for (const job of existingImapJobs) {
    await imapQueue.removeRepeatableByKey(job.key);
  }

  if (isImapConfigured()) {
    await imapQueue.add(
      'imap-poll',
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        jobId: 'imap-poll-repeatable',
      }
    );
    logger.info('📧 IMAP inbox polling enabled (every 5 min)');
  } else {
    logger.info('📧 IMAP not configured — inbox polling disabled. Set IMAP_HOST, IMAP_USER, IMAP_PASS in .env to enable.');
  }

  // ── Start workers ─────────────────────────────────────────────────────────
  startSlaWorker();
  startEmailWorker();
  startWebhookWorker();
  startReminderWorker();

  // Only start IMAP worker if credentials are real (saves memory/connections)
  if (isImapConfigured()) {
    startImapWorker();
  }

  const imapStatus = isImapConfigured() ? 'IMAP' : '(IMAP disabled)';
  logger.info(`✅ All BullMQ workers started: SLA, Email, Webhook, Reminder, ${imapStatus}`);
}

module.exports = { startSlaScheduler };
