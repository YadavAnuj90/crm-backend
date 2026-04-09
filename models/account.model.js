/**
 * models/account.model.js
 *
 * "Account" = a Company. Separate from "Organization" (your SaaS tenant).
 * An Account is the customer company your sales team is selling to.
 *
 * Indian-specific: GSTIN field, city/state for tier-based routing.
 */

const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true, default: null },
    industry: {
      type: String,
      enum: ['IT', 'FINANCE', 'HEALTHCARE', 'RETAIL', 'MANUFACTURING', 'EDUCATION', 'TELECOM', 'REAL_ESTATE', 'OTHER'],
      default: 'OTHER',
    },
    size: {
      type: String,
      enum: ['STARTUP', 'SMB', 'MID_MARKET', 'ENTERPRISE'],
      default: 'SMB',
    },
    phone: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    address: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    pincode: { type: String, trim: true, default: null },

    // Indian market specifics
    gstin: { type: String, trim: true, default: null },           // GST Identification Number
    pan: { type: String, trim: true, default: null },             // PAN for billing
    annualRevenue: { type: Number, default: null },                // in INR

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

accountSchema.index({ name: 'text', email: 1 });
accountSchema.index({ organizationId: 1 });
accountSchema.index({ assignedTo: 1 });
accountSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Account', accountSchema);
