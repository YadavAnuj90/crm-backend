/**
 * models/lead.model.js
 *
 * A Lead/Deal/Opportunity in the sales pipeline.
 * Tracks the full journey from NEW → CLOSED_WON / CLOSED_LOST.
 *
 * Follow-up reminders are stored here and processed by queues/workers/reminder.worker.js
 */

const mongoose = require('mongoose');

// Default pipeline stages — order matters for kanban rendering
const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

const followUpSchema = new mongoose.Schema(
  {
    note: { type: String, trim: true },
    remindAt: { type: Date, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    isReminderSent: { type: Boolean, default: false },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true }, // e.g. "ABC Corp — Enterprise License"

    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },

    source: {
      type: String,
      enum: ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'INBOUND', 'OTHER'],
      default: 'OTHER',
    },

    stage: {
      type: String,
      enum: PIPELINE_STAGES,
      default: 'NEW',
    },

    // Financials
    value: { type: Number, default: 0, min: 0 },                // Expected deal value in INR
    probability: { type: Number, default: 20, min: 0, max: 100 }, // % chance of closing
    expectedCloseDate: { type: Date, default: null },

    // Closure tracking
    lostReason: { type: String, trim: true, default: null },     // Required when stage = CLOSED_LOST
    wonAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },

    // Stage history for analytics (when each stage was entered)
    stageHistory: [
      {
        stage: { type: String },
        enteredAt: { type: Date, default: Date.now },
      },
    ],

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: [{ type: String, trim: true }],
    description: { type: String, trim: true, default: null },

    // Follow-up reminders (embedded for locality)
    followUps: [followUpSchema],

    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leadSchema.index({ stage: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ contactId: 1 });
leadSchema.index({ accountId: 1 });
leadSchema.index({ organizationId: 1 });
leadSchema.index({ isDeleted: 1 });
leadSchema.index({ expectedCloseDate: 1 });
leadSchema.index({ 'followUps.remindAt': 1, 'followUps.isCompleted': 1, 'followUps.isReminderSent': 1 }); // Reminder queries

module.exports = mongoose.model('Lead', leadSchema);
module.exports.PIPELINE_STAGES = PIPELINE_STAGES;
