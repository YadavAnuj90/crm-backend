/**
 * services/contactImport.service.js
 *
 * Parses an Excel (.xlsx) or CSV file and bulk-imports contacts.
 * Handles deduplication, validation, and error reporting per row.
 *
 * Expected columns (case-insensitive, supports common variations):
 *   First Name / Name / firstName
 *   Last Name / lastName
 *   Email / email address
 *   Phone / Mobile / mobile number
 *   Company / Account / company name
 *   Designation / Title / Job Title
 *   Source
 *   Tags (comma-separated)
 */

const XLSX = require('xlsx');
const Contact = require('../models/contact.model');
const logger = require('../config/logger');

// Maps common header variations to our canonical field names
const HEADER_MAP = {
  'first name': 'firstName',
  firstname: 'firstName',
  name: 'firstName',
  'full name': 'firstName',

  'last name': 'lastName',
  lastname: 'lastName',
  surname: 'lastName',

  email: 'email',
  'email address': 'email',
  'e-mail': 'email',

  phone: 'phone',
  mobile: 'phone',
  'mobile number': 'phone',
  'phone number': 'phone',
  'contact number': 'phone',

  'alternate phone': 'alternatePhone',
  'alternate mobile': 'alternatePhone',
  'other phone': 'alternatePhone',

  whatsapp: 'whatsapp',
  'whatsapp number': 'whatsapp',

  company: 'company',
  'company name': 'company',
  account: 'company',
  organization: 'company',

  designation: 'designation',
  title: 'designation',
  'job title': 'designation',

  department: 'department',

  source: 'source',
  tags: 'tags',
};

const VALID_SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'INBOUND', 'IMPORT', 'OTHER'];
const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(raw) {
  return (raw || '').toString().toLowerCase().trim().replace(/[_-]/g, ' ');
}

function cleanPhone(val) {
  if (!val) return null;
  // Strip spaces, dashes, +91 prefix
  const cleaned = val.toString().replace(/[\s\-+]/g, '').replace(/^91/, '');
  return PHONE_REGEX.test(cleaned) ? cleaned : null;
}

function cleanEmail(val) {
  if (!val) return null;
  const cleaned = val.toString().toLowerCase().trim();
  return EMAIL_REGEX.test(cleaned) ? cleaned : null;
}

function parseRow(row, headers) {
  const mapped = {};
  for (const [rawHeader, colIndex] of Object.entries(headers)) {
    const canonical = HEADER_MAP[normalizeHeader(rawHeader)];
    if (canonical) {
      mapped[canonical] = row[colIndex] !== undefined ? row[colIndex].toString().trim() : null;
    }
  }

  return {
    firstName: mapped.firstName || null,
    lastName: mapped.lastName || '',
    email: cleanEmail(mapped.email),
    phone: cleanPhone(mapped.phone),
    alternatePhone: cleanPhone(mapped.alternatePhone),
    whatsapp: cleanPhone(mapped.whatsapp),
    company: mapped.company || null,
    designation: mapped.designation || null,
    department: mapped.department || null,
    source: VALID_SOURCES.includes((mapped.source || '').toUpperCase()) ? mapped.source.toUpperCase() : 'IMPORT',
    tags: mapped.tags ? mapped.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  };
}

/**
 * Main import function.
 * @param {Buffer} buffer - Raw file buffer from multer memoryStorage
 * @param {string} filename - Original filename (used to detect CSV vs XLSX)
 * @param {{ organizationId, assignedTo }} meta - Tenant + assignee context
 * @returns {{ created, duplicates, errors, errorRows }}
 */
async function importContactsFromBuffer(buffer, filename, meta) {
  const isCsv = filename.toLowerCase().endsWith('.csv');

  // Parse workbook
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays (raw, no header inference)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    throw new Error('File has no data rows. Ensure row 1 is the header.');
  }

  // Build header → column-index map
  const headerRow = rows[0];
  const headers = {};
  headerRow.forEach((h, i) => {
    headers[h] = i;
  });

  const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell !== ''));

  const results = { created: 0, duplicates: 0, errors: 0, errorRows: [] };
  const BATCH_SIZE = 100;

  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const batch = dataRows.slice(i, i + BATCH_SIZE);
    const toInsert = [];

    for (let j = 0; j < batch.length; j++) {
      const rowNum = i + j + 2; // +2 because row 1 is header, 1-indexed
      const parsed = parseRow(batch[j], headers);

      if (!parsed.firstName) {
        results.errors++;
        results.errorRows.push({ row: rowNum, reason: 'Missing first name' });
        continue;
      }

      // Dedup check within batch (by email)
      if (parsed.email) {
        const isDupe = toInsert.some((c) => c.email === parsed.email);
        if (isDupe) {
          results.duplicates++;
          continue;
        }
      }

      toInsert.push({
        ...parsed,
        organizationId: meta.organizationId,
        assignedTo: meta.assignedTo,
        source: parsed.source || 'IMPORT',
      });
    }

    if (!toInsert.length) continue;

    // Bulk insert with ordered:false so one failure doesn't stop the batch
    try {
      const inserted = await Contact.insertMany(toInsert, {
        ordered: false,
        rawResult: true,
      });
      results.created += inserted.insertedCount || toInsert.length;
    } catch (err) {
      // insertMany with ordered:false throws a BulkWriteError for dupe keys
      // but still inserts the non-duplicate rows
      if (err.writeErrors) {
        const dupeCount = err.writeErrors.filter((e) => e.code === 11000).length;
        const otherErrors = err.writeErrors.filter((e) => e.code !== 11000);
        results.duplicates += dupeCount;
        results.errors += otherErrors.length;
        results.created += (toInsert.length - err.writeErrors.length);
        otherErrors.forEach((e) => {
          results.errorRows.push({ row: i + e.index + 2, reason: e.errmsg || 'Unknown error' });
        });
      } else {
        logger.error('Batch insert error: ' + err.message);
        results.errors += toInsert.length;
      }
    }
  }

  logger.info(`Contact import complete: ${JSON.stringify(results)}`);
  return results;
}

module.exports = { importContactsFromBuffer };
