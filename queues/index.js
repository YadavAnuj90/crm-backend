/**
 * queues/index.js
 * Central queue registry — all BullMQ queues defined here.
 * Workers are started separately in server.js so they don't run during tests.
 */

const { Queue } = require('bullmq');
const logger = require('../config/logger');

// Shared Redis connection options (BullMQ requires its own ioredis instance)
function getRedisConnection() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      maxRetriesPerRequest: null, // required by BullMQ
    };
  } catch {
    return { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null };
  }
}

const connection = getRedisConnection();

// ── Queue Definitions ─────────────────────────────────────────────────────────

/**
 * Email Queue — fire-and-forget, auto-removed on success.
 * Jobs: { to, subject, text, html? }
 */
const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Webhook Queue — retried with exponential backoff; dead-letter after max attempts.
 * Jobs: { webhookId, url, secret, event, payload }
 */
const webhookQueue = new Queue('webhook', {
  connection,
  defaultJobOptions: {
    attempts: 7,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 1000 },
  },
});

/**
 * SLA Queue — repeatable jobs scheduled via BullMQ cron.
 * Jobs: { type: 'check' | 'escalate' }
 */
const slaQueue = new Queue('sla', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Add an email job to the queue (non-blocking for caller).
 */
async function queueEmail(to, subject, text, html = null) {
  try {
    await emailQueue.add('send-email', { to, subject, text, html }, {
      priority: 2,
    });
  } catch (err) {
    logger.error('Failed to enqueue email: ' + err.message);
  }
}

/**
 * Add a webhook dispatch job to the queue.
 */
async function queueWebhook(webhookId, url, secret, event, payload) {
  try {
    await webhookQueue.add('dispatch-webhook', {
      webhookId: webhookId.toString(),
      url,
      secret,
      event,
      payload,
    });
  } catch (err) {
    logger.error('Failed to enqueue webhook: ' + err.message);
  }
}

/**
 * Register the two SLA repeatable jobs (idempotent — safe to call on every startup).
 */
async function registerSlaJobs() {
  try {
    // Remove stale repeatable jobs first so we never double-schedule
    const existing = await slaQueue.getRepeatableJobs();
    for (const job of existing) {
      await slaQueue.removeRepeatableByKey(job.key);
    }

    // SLA breach check — every 5 minutes
    await slaQueue.add(
      'sla-check',
      { type: 'check' },
      {
        repeat: { every: 5 * 60 * 1000 }, // 5 min in ms
        jobId: 'sla-check-repeatable',
      }
    );

    // Escalation — every 2 hours
    await slaQueue.add(
      'sla-escalate',
      { type: 'escalate' },
      {
        repeat: { every: 2 * 60 * 60 * 1000 }, // 2 hr in ms
        jobId: 'sla-escalate-repeatable',
      }
    );

    logger.info('SLA repeatable jobs registered in BullMQ');
  } catch (err) {
    logger.error('Failed to register SLA jobs: ' + err.message);
  }
}

module.exports = {
  emailQueue,
  webhookQueue,
  slaQueue,
  connection,
  queueEmail,
  queueWebhook,
  registerSlaJobs,
};
