const { z } = require('zod');

const SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'INBOUND', 'IMPORT', 'OTHER'];

const indianPhone = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
  .optional()
  .nullable();

const CreateContactSchema = z.object({
  firstName: z.string({ required_error: 'First name is required' }).min(1).max(100).trim(),
  lastName: z.string().max(100).trim().optional().default(''),
  email: z.string().email('Invalid email').toLowerCase().trim().optional().nullable(),
  phone: indianPhone,
  alternatePhone: indianPhone,
  whatsapp: indianPhone,
  designation: z.string().max(100).trim().optional().nullable(),
  department: z.string().max(100).trim().optional().nullable(),
  accountId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid accountId').optional().nullable(),
  company: z.string().max(200).trim().optional().nullable(),
  source: z.enum(SOURCES).optional().default('OTHER'),
  tags: z.array(z.string().max(50).trim()).max(10).optional().default([]),
  assignedTo: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid userId').optional().nullable(),
});

const UpdateContactSchema = CreateContactSchema.partial();

const MergeContactSchema = z.object({
  survivorId: z.string({ required_error: 'survivorId is required' }).regex(/^[a-f\d]{24}$/i),
  duplicateId: z.string({ required_error: 'duplicateId is required' }).regex(/^[a-f\d]{24}$/i),
});

module.exports = { CreateContactSchema, UpdateContactSchema, MergeContactSchema };
