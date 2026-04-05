/**
 * utils/email.js
 *
 * Public API for sending emails throughout the app.
 * All sends go through the BullMQ email queue — the caller is NEVER blocked.
 * The actual SMTP send happens in queues/workers/email.worker.js
 */

const logger = require('../config/logger');

let _queueEmail;

function getQueueEmail() {
  if (!_queueEmail) {
    // Lazy-require to avoid circular dependency issues at startup
    _queueEmail = require('../queues/index').queueEmail;
  }
  return _queueEmail;
}

/**
 * Enqueue an email for async delivery.
 * Returns immediately — does NOT await SMTP delivery.
 *
 * @param {string} to      - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text    - Plain-text body
 * @param {string} [html]  - Optional HTML body
 */
async function sendEmail(to, subject, text, html = null) {
  try {
    const queueEmail = getQueueEmail();
    await queueEmail(to, subject, text, html);
  } catch (err) {
    // Never throw — email is always best-effort from the caller's perspective
    logger.error(`Failed to enqueue email to ${to}: ${err.message}`);
  }
}

module.exports = { sendEmail };
