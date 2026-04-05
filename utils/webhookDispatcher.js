/**
 * utils/webhookDispatcher.js
 *
 * Replaces the old fire-and-forget HTTP dispatcher.
 * All webhook deliveries are now queued via BullMQ with:
 *  - Exponential backoff retries (up to 7 attempts)
 *  - Dead-letter flagging in the Webhook model after exhausting retries
 *  - Actual HTTP dispatch handled in queues/workers/webhook.worker.js
 */

const Webhook = require('../models/webhook.model');
const logger = require('../config/logger');

let _queueWebhook;

function getQueue() {
  if (!_queueWebhook) {
    _queueWebhook = require('../queues/index').queueWebhook;
  }
  return _queueWebhook;
}

/**
 * Enqueue webhook delivery for all active webhooks subscribed to `event`.
 * Returns immediately — delivery happens asynchronously in the worker.
 *
 * @param {string} event   - Event name e.g. 'ticket.overdue'
 * @param {object} payload - Event payload
 * @param {ObjectId} [orgId] - Optional: scope to a specific organization
 */
async function dispatchWebhook(event, payload, orgId = null) {
  try {
    const filter = { events: event, isActive: true };
    if (orgId) filter.organizationId = orgId;

    const webhooks = await Webhook.find(filter).lean();

    for (const wh of webhooks) {
      await getQueue()(wh._id, wh.url, wh.secret, event, payload);
    }

    if (webhooks.length > 0) {
      logger.info(`Queued ${webhooks.length} webhook(s) for event: ${event}`);
    }
  } catch (err) {
    logger.error('dispatchWebhook enqueue error: ' + err.message);
  }
}

module.exports = { dispatchWebhook };
