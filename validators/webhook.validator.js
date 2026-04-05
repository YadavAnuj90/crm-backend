/**
 * validators/webhook.validator.js
 * Zod schemas for webhook management endpoints.
 */

const { z } = require('zod');

const ALLOWED_EVENTS = [
  'ticket.created',
  'ticket.assigned',
  'ticket.status_changed',
  'ticket.resolved',
  'ticket.overdue',
  'payment.success',
  'payment.failed',
];

const CreateWebhookSchema = z.object({
  url: z
    .string({ required_error: 'url is required' })
    .url('url must be a valid URL')
    .refine(
      (u) => u.startsWith('https://') || u.startsWith('http://'),
      'url must use http or https'
    ),

  events: z
    .array(
      z.enum(ALLOWED_EVENTS, {
        errorMap: () => ({
          message: `Each event must be one of: ${ALLOWED_EVENTS.join(', ')}`,
        }),
      })
    )
    .min(1, 'At least one event is required')
    .max(ALLOWED_EVENTS.length, 'Too many events'),
});

const UpdateStatusSchema = z.object({
  userStatus: z.enum(['APPROVED', 'PENDING', 'REJECTED'], {
    errorMap: () => ({ message: 'userStatus must be APPROVED, PENDING, or REJECTED' }),
  }),
});

module.exports = { CreateWebhookSchema, UpdateStatusSchema };
