/**
 * models/emailThread.model.js
 *
 * Tracks every email in/out so we can do two-way threading.
 *
 * When an outbound email is sent to a customer (e.g. ticket created),
 * we store its Message-ID here. When the customer replies, the IMAP
 * service checks In-Reply-To against this table to find the associated ticket
 * and append the reply as a ticket comment.
 */

const mongoose = require('mongoose');

const emailThreadSchema = new mongoose.Schema(
  {
    // RFC 2822 email headers for threading
    messageId: { type: String, required: true, unique: true, trim: true }, // <uuid@domain>
    inReplyTo: { type: String, trim: true, default: null },
    references: [{ type: String, trim: true }],

    subject: { type: String, trim: true, default: null },
    fromEmail: { type: String, trim: true, lowercase: true },
    toEmail: { type: String, trim: true, lowercase: true },
    ccEmails: [{ type: String, trim: true, lowercase: true }],

    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true },

    // Plain text and HTML body
    textBody: { type: String, default: null },
    htmlBody: { type: String, default: null },

    // Cross-links
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // created comment

    // IMAP metadata
    uid: { type: Number, default: null },           // IMAP UID for marking as read
    mailbox: { type: String, default: 'INBOX' },

    isProcessed: { type: Boolean, default: false }, // True once reply is converted to comment

    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailThreadSchema.index({ messageId: 1 }, { unique: true });
emailThreadSchema.index({ inReplyTo: 1 });
emailThreadSchema.index({ ticketId: 1 });
emailThreadSchema.index({ contactId: 1 });
emailThreadSchema.index({ fromEmail: 1 });
emailThreadSchema.index({ isProcessed: 1 });
emailThreadSchema.index({ organizationId: 1 });

module.exports = mongoose.model('EmailThread', emailThreadSchema);
