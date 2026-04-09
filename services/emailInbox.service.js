/**
 * services/emailInbox.service.js
 *
 * IMAP email inbox poller.
 * Every 5 minutes (via BullMQ repeatable job in imap queue):
 *   1. Connect to IMAP server
 *   2. Fetch unseen emails from INBOX
 *   3. For each email:
 *      a. Parse headers: Message-ID, In-Reply-To, References
 *      b. Check if In-Reply-To matches a known outbound EmailThread record
 *         → If yes: create a ticket Comment + ContactActivity (threading)
 *         → If no:  create a new Ticket from the email (first contact)
 *      c. Store the inbound EmailThread record
 *      d. Mark email as SEEN in IMAP
 *   4. Disconnect cleanly
 *
 * Configuration (env vars):
 *   IMAP_HOST       - e.g. imap.gmail.com
 *   IMAP_PORT       - e.g. 993
 *   IMAP_USER       - support@yourcompany.com
 *   IMAP_PASS       - App password
 *   IMAP_TLS        - true/false (default true)
 *   IMAP_MAILBOX    - Mailbox to poll (default INBOX)
 *   SUPPORT_EMAIL   - The address tickets are sent FROM (for threading)
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const mongoose = require('mongoose');
const EmailThread = require('../models/emailThread.model');
const Comment = require('../models/comment.model');
const Ticket = require('../models/ticket.model');
const Contact = require('../models/contact.model');
const ContactActivity = require('../models/contactActivity.model');
const logger = require('../config/logger');

// ── IMAP Configuration ────────────────────────────────────────────────────────

function getImapConfig() {
  return {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_TLS !== 'false', // Default TLS on
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS,
    },
    logger: false, // Silence imapflow's built-in logger
    tls: { rejectUnauthorized: false },
    emitLogs: false,
  };
}

function isImapConfigured() {
  const { IMAP_HOST, IMAP_USER, IMAP_PASS } = process.env;
  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) return false;

  // Reject obvious placeholder / example values shipped in the default .env
  const placeholders = ['your-app-password', 'yourpassword', 'changeme', 'password', 'example'];
  if (placeholders.some((p) => IMAP_PASS.toLowerCase().includes(p))) return false;
  if (IMAP_USER.includes('yourcompany') || IMAP_USER.includes('@example')) return false;

  return true;
}

// ── Match a reply to an existing ticket ──────────────────────────────────────

async function findParentTicket(parsedEmail) {
  const candidates = [parsedEmail.inReplyTo, ...(parsedEmail.references || [])].filter(Boolean);

  for (const msgId of candidates) {
    const thread = await EmailThread.findOne({ messageId: msgId.trim() }).lean();
    if (thread?.ticketId) {
      const ticket = await Ticket.findOne({ _id: thread.ticketId, isDeleted: { $ne: true } }).lean();
      if (ticket) return { ticket, thread };
    }
  }
  return null;
}

// ── Find or create a Contact from an email address ───────────────────────────

async function findOrCreateContact(fromEmail, fromName) {
  let contact = await Contact.findOne({ email: fromEmail, isDeleted: { $ne: true } }).lean();

  if (!contact) {
    const nameParts = (fromName || fromEmail.split('@')[0]).split(' ');
    contact = await Contact.create({
      firstName: nameParts[0] || fromEmail,
      lastName: nameParts.slice(1).join(' ') || '',
      email: fromEmail,
      source: 'EMAIL',
      status: 'ACTIVE',
    });
  }

  return contact;
}

// ── Extract clean text from parsed email ─────────────────────────────────────

function extractBody(parsed) {
  if (parsed.text) {
    // Strip quoted reply chains (lines starting with >)
    return parsed.text
      .split('\n')
      .filter((line) => !line.trim().startsWith('>'))
      .join('\n')
      .trim();
  }
  return parsed.subject || '(No content)';
}

// ── Process a single email message ───────────────────────────────────────────

async function processEmail(raw) {
  let parsed;
  try {
    parsed = await simpleParser(raw);
  } catch (err) {
    logger.error('Email parse error: ' + err.message);
    return;
  }

  const messageId = (parsed.messageId || '').trim();
  const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
  const fromName = parsed.from?.value?.[0]?.name || '';

  if (!fromEmail || !messageId) {
    logger.warn('Skipping email: missing messageId or fromEmail');
    return;
  }

  // Idempotency: skip if already processed
  const existing = await EmailThread.findOne({ messageId }).lean();
  if (existing?.isProcessed) {
    logger.info(`Email ${messageId} already processed, skipping`);
    return;
  }

  const bodyText = extractBody(parsed);
  const subject = parsed.subject || '(No subject)';

  // ── Case 1: Reply to an existing ticket ───────────────────────────────────

  const match = await findParentTicket(parsed);

  if (match) {
    const { ticket } = match;

    // Find contact
    const contact = await findOrCreateContact(fromEmail, fromName);

    // Create a Comment on the ticket
    const comment = await Comment.create({
      ticketId: ticket._id,
      userId: contact._id.toString(),
      comment: `📧 **Email reply from ${fromName || fromEmail}:**\n\n${bodyText}`,
    });

    // Store inbound email thread record
    await EmailThread.findOneAndUpdate(
      { messageId },
      {
        messageId,
        inReplyTo: parsed.inReplyTo || null,
        references: parsed.references || [],
        subject,
        fromEmail,
        toEmail: parsed.to?.value?.[0]?.address?.toLowerCase() || process.env.IMAP_USER,
        direction: 'INBOUND',
        textBody: bodyText,
        htmlBody: parsed.html || null,
        ticketId: ticket._id,
        contactId: contact._id,
        commentId: comment._id,
        isProcessed: true,
        receivedAt: parsed.date || new Date(),
      },
      { upsert: true, new: true }
    );

    // Log to contact's activity timeline
    await ContactActivity.create({
      contactId: contact._id,
      ticketId: ticket._id,
      type: 'EMAIL',
      direction: 'INBOUND',
      title: `Email reply: "${subject}"`,
      body: bodyText.length > 200 ? bodyText.substring(0, 200) + '...' : bodyText,
      metadata: { messageId, ticketId: ticket._id },
      performedAt: parsed.date || new Date(),
    });

    logger.info(`✉️  Email threaded → ticket #${ticket._id} (comment created)`);
    return;
  }

  // ── Case 2: New inbound email — create a new support ticket ──────────────

  const contact = await findOrCreateContact(fromEmail, fromName);

  const ticket = await Ticket.create({
    title: subject.substring(0, 200),
    description: bodyText || subject,
    ticketStatus: 'OPEN',
    ticketPriority: 'MEDIUM',
    category: 'GENERAL',
    reportedBy: contact._id.toString(),
    slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default SLA
  });

  // Store inbound thread record linked to the new ticket
  await EmailThread.create({
    messageId,
    inReplyTo: parsed.inReplyTo || null,
    references: parsed.references || [],
    subject,
    fromEmail,
    toEmail: process.env.IMAP_USER,
    direction: 'INBOUND',
    textBody: bodyText,
    htmlBody: parsed.html || null,
    ticketId: ticket._id,
    contactId: contact._id,
    isProcessed: true,
    receivedAt: parsed.date || new Date(),
  });

  // Log to contact's timeline
  await ContactActivity.create({
    contactId: contact._id,
    ticketId: ticket._id,
    type: 'EMAIL',
    direction: 'INBOUND',
    title: `New email ticket: "${subject}"`,
    body: bodyText.length > 200 ? bodyText.substring(0, 200) + '...' : bodyText,
    metadata: { messageId, newTicket: true },
    performedAt: parsed.date || new Date(),
  });

  logger.info(`✉️  New email → ticket #${ticket._id} created from ${fromEmail}`);
}

// ── Main Poll Function ────────────────────────────────────────────────────────

async function pollInbox() {
  if (!isImapConfigured()) {
    logger.info('IMAP not configured, skipping inbox poll');
    return;
  }

  const client = new ImapFlow(getImapConfig());

  try {
    await client.connect();

    const mailbox = process.env.IMAP_MAILBOX || 'INBOX';
    await client.mailboxOpen(mailbox);

    // Fetch only UNSEEN messages to avoid re-processing
    const messages = [];
    for await (const msg of client.fetch({ seen: false }, { source: true, uid: true })) {
      messages.push({ uid: msg.uid, source: msg.source });
    }

    logger.info(`IMAP poll: ${messages.length} unseen message(s) in ${mailbox}`);

    for (const { uid, source } of messages) {
      await processEmail(source);

      // Mark as SEEN so we don't reprocess on next poll
      await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
    }

    await client.mailboxClose();
  } catch (err) {
    logger.error('IMAP poll error: ' + err.message);
  } finally {
    try {
      await client.logout();
    } catch (_) { /* ignore */ }
  }
}

module.exports = { pollInbox, isImapConfigured };
