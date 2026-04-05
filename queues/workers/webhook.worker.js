/**
 * queues/workers/webhook.worker.js
 *
 * Processes webhook dispatch jobs with:
 *  - Exponential backoff retry (up to 7 attempts)
 *  - Dead-letter tracking: failed jobs are flagged in DB after all retries exhausted
 *  - HMAC-SHA256 signature on every request
 */

const { Worker } = require('bullmq');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { connection } = require('../index');
const Webhook = require('../../models/webhook.model');
const logger = require('../../config/logger');

/**
 * Send an HTTP POST and resolve with the response status code.
 * Rejects if there's a network error or non-2xx response.
 */
function sendWebhookRequest(url, body, signature, event) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const requester = isHttps ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-CRM-Signature': `sha256=${signature}`,
        'X-CRM-Event': event,
      },
      timeout: 10000, // 10s hard timeout per attempt
    };

    const req = requester.request(options, (res) => {
      // Drain the response to free the socket
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(res.statusCode);
      } else {
        reject(new Error(`Non-2xx response: ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Webhook request timed out'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function startWebhookWorker() {
  const worker = new Worker(
    'webhook',
    async (job) => {
      const { webhookId, url, secret, event, payload } = job.data;

      const body = JSON.stringify({
        event,
        payload,
        timestamp: new Date().toISOString(),
        attempt: job.attemptsMade + 1,
      });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      await sendWebhookRequest(url, body, signature, event);

      // Mark success in DB
      await Webhook.findByIdAndUpdate(webhookId, {
        lastTriggeredAt: new Date(),
        failureCount: 0,
        $unset: { deadLettered: '' },
      }).exec();

      logger.info(`Webhook dispatched → ${url} [${event}]`);
    },
    {
      connection,
      concurrency: 10,
    }
  );

  // When a job fails but has remaining attempts, log a warning
  worker.on('failed', async (job, err) => {
    const { webhookId, url, event } = job?.data || {};

    // Increment failure count on every failed attempt
    if (webhookId) {
      await Webhook.findByIdAndUpdate(webhookId, {
        $inc: { failureCount: 1 },
      }).exec();
    }

    const attemptsLeft = (job?.opts?.attempts || 7) - (job?.attemptsMade || 0);

    if (attemptsLeft <= 0) {
      // All retries exhausted → dead-letter: flag in DB so ops team can investigate
      logger.error(
        `Webhook DEAD-LETTERED after ${job?.attemptsMade} attempts → ${url} [${event}]: ${err.message}`
      );
      if (webhookId) {
        await Webhook.findByIdAndUpdate(webhookId, {
          deadLettered: true,
          deadLetteredAt: new Date(),
          deadLetteredReason: err.message,
        }).exec();
      }
    } else {
      logger.warn(
        `Webhook attempt ${job?.attemptsMade} failed → ${url} [${event}] (${attemptsLeft} retries left): ${err.message}`
      );
    }
  });

  worker.on('error', (err) => {
    logger.error('Webhook worker error: ' + err.message);
  });

  logger.info('Webhook worker started');
  return worker;
}

module.exports = { startWebhookWorker };
