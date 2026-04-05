/**
 * validators/auth.validator.js
 * Zod schemas for all authentication endpoints.
 */

const { z } = require('zod');

// ── Reusable primitives ───────────────────────────────────────────────────────

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email format')
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ── Schemas ───────────────────────────────────────────────────────────────────

const SignupSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .trim(),

  userId: z
    .string({ required_error: 'userId is required' })
    .min(3, 'userId must be at least 3 characters')
    .max(50, 'userId too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'userId can only contain letters, numbers, _ and -')
    .trim(),

  email: emailField,

  password: passwordField,

  userType: z
    .enum(['CUSTOMER', 'ENGINEER', 'ADMIN'], {
      errorMap: () => ({ message: 'userType must be CUSTOMER, ENGINEER, or ADMIN' }),
    })
    .optional()
    .default('CUSTOMER'),
});

const LoginSchema = z.object({
  email: emailField,

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),

  twoFactorToken: z
    .string()
    .length(6, '2FA token must be 6 digits')
    .regex(/^\d{6}$/, '2FA token must be numeric')
    .optional(),
});

const ForgotPasswordSchema = z.object({
  email: emailField,
});

const ResetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }).min(1),
  newPassword: passwordField,
});

const ResendVerificationSchema = z.object({
  email: emailField,
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'refreshToken is required' }).min(1),
});

module.exports = {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ResendVerificationSchema,
  RefreshTokenSchema,
};
