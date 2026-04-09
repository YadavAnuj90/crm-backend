const { z } = require('zod');

const CreateNoteSchema = z.object({
  content: z
    .string({ required_error: 'Note content is required' })
    .min(1, 'Note cannot be empty')
    .max(5000)
    .trim(),

  // Attach to an entity — at least one must be provided (validated in controller)
  contactId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  leadId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  ticketId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  accountId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),

  // Follow-up reminder
  reminderAt: z.string().datetime({ offset: true }).optional().nullable(),
  reminderAssignedTo: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),

  isPinned: z.boolean().optional().default(false),
});

const UpdateNoteSchema = z.object({
  content: z.string().min(1).max(5000).trim().optional(),
  reminderAt: z.string().datetime({ offset: true }).optional().nullable(),
  reminderAssignedTo: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  isPinned: z.boolean().optional(),
});

const CreateAccountSchema = z.object({
  name: z.string({ required_error: 'Company name is required' }).min(1).max(200).trim(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  industry: z
    .enum(['IT', 'FINANCE', 'HEALTHCARE', 'RETAIL', 'MANUFACTURING', 'EDUCATION', 'TELECOM', 'REAL_ESTATE', 'OTHER'])
    .optional()
    .default('OTHER'),
  size: z.enum(['STARTUP', 'SMB', 'MID_MARKET', 'ENTERPRISE']).optional().default('SMB'),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().toLowerCase().trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  state: z.string().max(100).trim().optional().nullable(),
  pincode: z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincode').optional().nullable(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .nullable(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .optional()
    .nullable(),
  annualRevenue: z.number().nonnegative().optional().nullable(),
  assignedTo: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
});

module.exports = { CreateNoteSchema, UpdateNoteSchema, CreateAccountSchema };
