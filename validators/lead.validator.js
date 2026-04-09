const { z } = require('zod');

const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'INBOUND', 'OTHER'];

const CreateLeadSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(3).max(300).trim(),

  contactId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid contactId').optional(),
  accountId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid accountId').optional(),

  source: z.enum(SOURCES).optional().default('OTHER'),
  stage: z.enum(PIPELINE_STAGES).optional().default('NEW'),

  value: z.number().nonnegative('Value cannot be negative').optional().default(0),
  probability: z.number().min(0).max(100).optional().default(20),
  expectedCloseDate: z.string().datetime({ offset: true }).optional(),

  description: z.string().max(2000).trim().optional(),
  tags: z.array(z.string().max(50).trim()).max(10).optional().default([]),
  assignedTo: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid userId').optional(),
});

const UpdateLeadSchema = z.object({
  title: z.string().min(3).max(300).trim().optional(),
  contactId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  accountId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
  source: z.enum(SOURCES).optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  value: z.number().nonnegative().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime({ offset: true }).optional().nullable(),
  lostReason: z.string().max(500).trim().optional().nullable(),
  description: z.string().max(2000).trim().optional(),
  tags: z.array(z.string().max(50).trim()).max(10).optional(),
  assignedTo: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
}).refine(
  (data) => !(data.stage === 'CLOSED_LOST' && !data.lostReason),
  { message: 'lostReason is required when closing a lead as LOST', path: ['lostReason'] }
);

const AddFollowUpSchema = z.object({
  note: z.string().max(1000).trim().optional(),
  remindAt: z.string({ required_error: 'remindAt is required' }).datetime({ offset: true }),
  assignedTo: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid userId').optional(),
});

module.exports = { CreateLeadSchema, UpdateLeadSchema, AddFollowUpSchema };
