/**
 * utils/slaChecker.js
 *
 * Kept as a thin shim for backward-compatibility (server.js calls startSlaScheduler).
 * All SLA logic now lives in queues/workers/sla.worker.js.
 * This module starts the worker process and registers the repeatable BullMQ jobs.
 */

const logger = require('../config/logger');

async function startSlaScheduler() {
  const { registerSlaJobs } = require('../queues/index');
  const { startSlaWorker } = require('../queues/workers/sla.worker');
  const { startEmailWorker } = require('../queues/workers/email.worker');
  const { startWebhookWorker } = require('../queues/workers/webhook.worker');

  // Register repeatable SLA jobs in Redis (idempotent)
  await registerSlaJobs();

  // Start all workers
  startSlaWorker();
  startEmailWorker();
  startWebhookWorker();

  logger.info('All BullMQ workers started (SLA, Email, Webhook)');
}

module.exports = { startSlaScheduler };
