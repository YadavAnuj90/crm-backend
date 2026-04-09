/**
 * models/contact.model.js
 *
 * A Contact is a person — the human your sales/support team interacts with.
 * They belong to an Account (company). Multiple contacts can belong to one Account.
 *
 * Deduplication: contacts with the same email within an org are flagged.
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    alternatePhone: { type: String, trim: true, default: null },
    whatsapp: { type: String, trim: true, default: null },    // Indian: separate WhatsApp number
    designation: { type: String, trim: true, default: null }, // Job title
    department: { type: String, trim: true, default: null },

    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    company: { type: String, trim: true, default: null }, // Free-text fallback if no Account

    source: {
      type: String,
      enum: ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'INBOUND', 'IMPORT', 'OTHER'],
      default: 'OTHER',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
      default: 'ACTIVE',
    },

    tags: [{ type: String, trim: true }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Contact deduplication
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },

    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound unique index: email per org (allow null emails)
contactSchema.index(
  { email: 1, organizationId: 1 },
  { unique: true, partialFilterExpression: { email: { $ne: null } } }
);

contactSchema.index({ organizationId: 1 });
contactSchema.index({ accountId: 1 });
contactSchema.index({ assignedTo: 1 });
contactSchema.index({ isDeleted: 1 });
contactSchema.index({ isDuplicate: 1 });
contactSchema.index({ firstName: 'text', lastName: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Contact', contactSchema);
