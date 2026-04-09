/**
 * models/note.model.js
 *
 * Notes can be attached to any entity: Contact, Lead, Ticket, Account.
 * Each note can optionally carry a follow-up reminder (processed by reminder.worker.js).
 */

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Attach to one or more entities (polymorphic)
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },

    // Follow-up reminder
    reminderAt: { type: Date, default: null },
    reminderAssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isReminderSent: { type: Boolean, default: false },
    reminderSentAt: { type: Date, default: null },

    // Pinned notes stay at top of timeline
    isPinned: { type: Boolean, default: false },

    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

noteSchema.index({ contactId: 1 });
noteSchema.index({ leadId: 1 });
noteSchema.index({ ticketId: 1 });
noteSchema.index({ accountId: 1 });
noteSchema.index({ authorId: 1 });
noteSchema.index({ reminderAt: 1, isReminderSent: 1 }); // For reminder worker queries
noteSchema.index({ organizationId: 1 });
noteSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Note', noteSchema);
