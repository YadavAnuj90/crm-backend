const crypto = require('crypto');
const https = require('https');
const http = require('http');
const Webhook = require('../models/webhook.model');
const logger = require('../config/logger');

async function dispatchWebhook(event, payload) {
  try {
    const webhooks = await Webhook.find({ events: event, isActive: true });
    for (const wh of webhooks) {
      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const signature = crypto
        .createHmac('sha256', wh.secret)
        .update(body)
        .digest('hex');

      const url = new URL(wh.url);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-CRM-Signature': `sha256=${signature}`,
          'X-CRM-Event': event
        }
      };

      const requester = url.protocol === 'https:' ? https : http;
      const req = requester.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          Webhook.findByIdAndUpdate(wh._id, { lastTriggeredAt: new Date(), failureCount: 0 }).exec();
        } else {
          Webhook.findByIdAndUpdate(wh._id, { $inc: { failureCount: 1 } }).exec();
        }
      });

      req.on('error', (err) => {
        logger.error(`Webhook dispatch error for ${wh.url}: ${err.message}`);
        Webhook.findByIdAndUpdate(wh._id, { $inc: { failureCount: 1 } }).exec();
      });

      req.write(body);
      req.end();
    }
  } catch (err) {
    logger.error('dispatchWebhook error: ' + err.message);
  }
}

module.exports = { dispatchWebhook };
