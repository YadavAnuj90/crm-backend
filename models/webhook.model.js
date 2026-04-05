const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  url: { type: String, required: true },
  secret: { type: String, required: true },
  events: [{
    type: String,
    enum: ['ticket.created', 'ticket.assigned', 'ticket.status_changed', 'ticket.resolved', 'ticket.overdue', 'payment.success', 'payment.failed']
  }],
  isActive: { type: Boolean, default: true },
  lastTriggeredAt: { type: Date, default: null },
  failureCount: { type: Number, default: 0 },
  // Dead-letter tracking — set by webhook.worker.js after all retries exhausted
  deadLettered: { type: Boolean, default: false },
  deadLetteredAt: { type: Date, default: null },
  deadLetteredReason: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Webhook', webhookSchema);
