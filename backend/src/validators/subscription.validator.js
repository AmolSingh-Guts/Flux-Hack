import { z } from 'zod';
import {
  basePaginationSchema,
  dateSchema,
  moneySchema,
  optionalText,
} from './common.validator.js';

export const subscriptionLineSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive().optional().nullable(),
  planId: z.coerce.number().int().positive().optional().nullable(),
  description: optionalText(255),
  quantity: z.coerce.number().positive(),
  unitPrice: moneySchema.optional().nullable(),
  discountAmount: moneySchema.optional().default(0),
});

export const subscriptionListSchema = basePaginationSchema.extend({
  status: z
    .enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'])
    .optional(),
  customerId: z.coerce.number().int().positive().optional(),
  planId: z.coerce.number().int().positive().optional(),
});

export const subscriptionCreateSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  planId: z.coerce.number().int().positive(),
  startDate: dateSchema,
  expiryDate: dateSchema.optional(),
  nextBillingDate: dateSchema.optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  status: z.enum(['DRAFT', 'CONFIRMED', 'ACTIVE']).default('DRAFT'),
  notes: optionalText(2000),
  lines: z.array(subscriptionLineSchema).min(1, 'Add at least one line item.'),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema
  .omit({ status: true })
  .partial();

export const subscriptionCloseSchema = z.object({
  reason: optionalText(255),
});

export const subscriptionInvoiceSchema = z.object({
  billingPeriodStart: dateSchema.optional(),
  invoiceDate: dateSchema.optional(),
  dueDate: dateSchema.optional(),
  notes: optionalText(2000),
});
