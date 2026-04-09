/**
 * queues/workers/imap.worker.js
 *
 * Runs the IMAP inbox poll on a BullMQ repeatable schedule (every 5 minutes).
 * Concurrency 1 — never overlap two IMAP connections.
 */

const { Worker } = require('bullmq');
const { connection } = require('../index');
const { pollInbox } = require('../../services/emailInbox.service');
const logger = require('../../config/logger');

function startImapWorker() {
  const worker = new Worker(
    'imap',
    async () => {
      await pollInbox();
    },
    {
      connection,
      concurrency: 1,
      lockDuration: 5 * 60 * 1000, // Hold the job lock for up to 5 min (matches poll interval)
    }
  );

  worker.on('completed', () => logger.info('IMAP poll job completed'));
  worker.on('failed', (job, err) => logger.error(`IMAP poll job failed: ${err.message}`));
  worker.on('error', (err) => logger.error('IMAP worker error: ' + err.message));

  logger.info('IMAP worker started');
  return worker;
}

module.exports = { startImapWorker };
