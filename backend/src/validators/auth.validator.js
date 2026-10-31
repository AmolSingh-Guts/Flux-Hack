import { z } from 'zod';
import {
  emailSchema,
  optionalText,
  passwordSchema,
} from './common.validator.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: emailSchema,
  password: passwordSchema,
  companyName: optionalText(190),
  phone: optionalText(40),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(72),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().length(64, 'Invalid reset token.'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: emailSchema.optional(),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: emailSchema,
  password: passwordSchema,
  permissions: z
    .array(
      z.enum([
        'customers',
        'quotations',
        'subscriptions',
        'invoices',
        'payments',
      ]),
    )
    .default([]),
  isActive: z.boolean().optional().default(true),
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  permissions: z
    .array(
      z.enum([
        'customers',
        'quotations',
        'subscriptions',
        'invoices',
        'payments',
      ]),
    )
    .optional(),
  isActive: z.boolean().optional(),
});
