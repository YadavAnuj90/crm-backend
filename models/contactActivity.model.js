/**
 * models/contactActivity.model.js
 *
 * The unified activity timeline for a contact.
 * Every interaction — call, email, ticket, payment, WhatsApp, note, meeting —
 * is recorded here as a single chronological stream.
 *
 * This is the model that makes a CRM "feel" like a CRM.
 * It's written-to from many places (ticket controller, payment controller,
 * note controller, email inbox service, etc.)
 */

const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'CALL',          // Phone call (inbound or outbound)
  'EMAIL',         // Email sent or received
  'TICKET',        // Support ticket created / updated
  'PAYMENT',       // Payment made
  'NOTE',          // Manual note logged
  'WHATSAPP',      // WhatsApp message
  'SMS',           // SMS
  'MEETING',       // In-person or virtual meeting
  'TASK',          // Task / follow-up
  'LEAD_STAGE',    // Lead moved to a new pipeline stage
  'SYSTEM',        // Auto-generated system event
];

const contactActivitySchema = new mongoose.Schema(
  {
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },

    // Optional entity references for cross-linking
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND', 'INTERNAL'], default: 'INTERNAL' },

    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true, default: null },

    // Flexible extra data: call duration, email subject, stage name, etc.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performedAt: { type: Date, default: Date.now },

    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  },
  { timestamps: true }
);

contactActivitySchema.index({ contactId: 1, performedAt: -1 }); // Primary timeline query
contactActivitySchema.index({ leadId: 1 });
contactActivitySchema.index({ ticketId: 1 });
contactActivitySchema.index({ type: 1 });
contactActivitySchema.index({ organizationId: 1 });

module.exports = mongoose.model('ContactActivity', contactActivitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
