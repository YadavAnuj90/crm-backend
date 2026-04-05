/**
 * validators/payment.validator.js
 * Zod schemas for payment and subscription endpoints.
 */

const { z } = require('zod');

const CreateOrderSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(10000000, 'Amount cannot exceed 1 crore'), // ₹1,00,00,000
});

const VerifyPaymentSchema = z.object({
  orderId: z.string({ required_error: 'orderId is required' }).min(1),
  paymentId: z.string({ required_error: 'paymentId is required' }).min(1),
  signature: z.string({ required_error: 'signature is required' }).min(1),
});

const CreatePlanSchema = z.object({
  planType: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY'], {
    errorMap: () => ({ message: 'planType must be MONTHLY, QUARTERLY, or YEARLY' }),
  }),
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive'),
});

const CreateSubscriptionSchema = z.object({
  planId: z.string({ required_error: 'planId is required' }).min(1),
});

module.exports = {
  CreateOrderSchema,
  VerifyPaymentSchema,
  CreatePlanSchema,
  CreateSubscriptionSchema,
};
