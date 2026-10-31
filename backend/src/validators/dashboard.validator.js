import { z } from 'zod';
import { dateSchema, optionalText, emailSchema } from './common.validator.js';

export const dashboardQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const reportQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  search: z.string().trim().max(120).optional().default(''),
});

export const reportExportSchema = reportQuerySchema.extend({
  type: z.enum([
    'revenue',
    'payments',
    'subscriptions',
    'invoices',
    'customers',
    'overdue',
  ]),
});

export const settingsUpdateSchema = z.object({
  companyName: z.string().trim().min(2).max(190).optional(),
  email: emailSchema.optional(),
  phone: optionalText(40),
  address: optionalText(255),
  city: optionalText(100),
  state: optionalText(100),
  country: z.string().trim().max(100).optional(),
  gstNumber: optionalText(50),
  currency: z.string().trim().length(3).optional(),
  invoicePrefix: z.string().trim().min(1).max(12).optional(),
  quotationPrefix: z.string().trim().min(1).max(12).optional(),
  subscriptionPrefix: z.string().trim().min(1).max(12).optional(),
  paymentPrefix: z.string().trim().min(1).max(12).optional(),
  invoiceFooter: optionalText(500),
});

export const portalProfileSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  phone: optionalText(40),
  companyName: optionalText(190),
  address: optionalText(255),
  city: optionalText(100),
  state: optionalText(100),
  country: z.string().trim().max(100).optional(),
  gstNumber: optionalText(50),
});

export const portalCloseSchema = z.object({
  reason: optionalText(255),
});

export const portalListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional().default(''),
  status: z.string().trim().max(40).optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});
