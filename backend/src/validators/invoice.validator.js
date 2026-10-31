import { z } from 'zod';
import {
  basePaginationSchema,
  dateSchema,
  moneySchema,
  optionalText,
} from './common.validator.js';

export const invoiceLineSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive().optional().nullable(),
  description: optionalText(255),
  quantity: z.coerce.number().positive(),
  unitPrice: moneySchema.optional().nullable(),
  discountAmount: moneySchema.optional().default(0),
});

export const invoiceListSchema = basePaginationSchema.extend({
  status: z
    .enum([
      'DRAFT',
      'CONFIRMED',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'CANCELLED',
    ])
    .optional(),
  customerId: z.coerce.number().int().positive().optional(),
  subscriptionId: z.coerce.number().int().positive().optional(),
  overdueOnly: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const invoiceCreateSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  subscriptionId: z.coerce.number().int().positive().optional().nullable(),
  invoiceDate: dateSchema.optional(),
  dueDate: dateSchema.optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  notes: optionalText(2000),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
  discountId: z.coerce.number().int().positive().optional().nullable(),
  applyDiscount: z.boolean().optional().default(true),
  lines: z.array(invoiceLineSchema).min(1, 'Add at least one line item.'),
});

export const invoiceUpdateSchema = invoiceCreateSchema
  .omit({ customerId: true, subscriptionId: true, status: true, discountId: true })
  .partial();

export const invoiceEmailSchema = z.object({
  message: optionalText(1000),
});

export const invoiceGenerateSchema = z.object({
  billingPeriodStart: dateSchema.optional(),
  invoiceDate: dateSchema.optional(),
  dueDate: dateSchema.optional(),
  notes: optionalText(2000),
});
