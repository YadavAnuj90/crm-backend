/**
 * validators/ticket.validator.js
 * Zod schemas for all ticket endpoints.
 */

const { z } = require('zod');

const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const TICKET_CATEGORIES = ['TECHNICAL', 'BILLING', 'GENERAL', 'FEATURE_REQUEST', 'BUG', 'OTHER'];

const CreateTicketSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),

  description: z
    .string({ required_error: 'Description is required' })
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim(),

  priority: z
    .enum(TICKET_PRIORITIES, {
      errorMap: () => ({ message: `priority must be one of: ${TICKET_PRIORITIES.join(', ')}` }),
    })
    .optional()
    .default('LOW'),

  category: z
    .enum(TICKET_CATEGORIES, {
      errorMap: () => ({ message: `category must be one of: ${TICKET_CATEGORIES.join(', ')}` }),
    })
    .optional()
    .default('GENERAL'),

  tags: z
    .array(z.string().max(50).trim())
    .max(10, 'Cannot have more than 10 tags')
    .optional()
    .default([]),
});

const UpdateStatusSchema = z.object({
  ticketStatus: z.enum(TICKET_STATUSES, {
    errorMap: () => ({ message: `ticketStatus must be one of: ${TICKET_STATUSES.join(', ')}` }),
  }),
});

const AssignTicketSchema = z.object({
  engineerId: z
    .string({ required_error: 'engineerId is required' })
    .min(1, 'engineerId cannot be empty'),
});

const AddFeedbackSchema = z.object({
  rating: z
    .number({ required_error: 'Rating is required', invalid_type_error: 'Rating must be a number' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),

  feedback: z
    .string()
    .max(1000, 'Feedback cannot exceed 1000 characters')
    .trim()
    .optional(),
});

const BulkAssignSchema = z.object({
  ticketIds: z
    .array(z.string().min(1))
    .min(1, 'At least one ticket ID is required')
    .max(100, 'Cannot bulk assign more than 100 tickets at once'),

  engineerId: z
    .string({ required_error: 'engineerId is required' })
    .min(1, 'engineerId cannot be empty'),
});

const BulkStatusSchema = z.object({
  ticketIds: z
    .array(z.string().min(1))
    .min(1, 'At least one ticket ID is required')
    .max(100, 'Cannot bulk update more than 100 tickets at once'),

  ticketStatus: z.enum(TICKET_STATUSES, {
    errorMap: () => ({ message: `ticketStatus must be one of: ${TICKET_STATUSES.join(', ')}` }),
  }),
});

const AddCommentSchema = z.object({
  comment: z
    .string({ required_error: 'comment is required' })
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment cannot exceed 2000 characters')
    .trim(),
});

module.exports = {
  CreateTicketSchema,
  UpdateStatusSchema,
  AssignTicketSchema,
  AddFeedbackSchema,
  BulkAssignSchema,
  BulkStatusSchema,
  AddCommentSchema,
};
