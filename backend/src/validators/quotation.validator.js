import { z } from 'zod';
import {
  basePaginationSchema,
  dateSchema,
  moneySchema,
  optionalText,
} from './common.validator.js';

export const quotationLineSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive().optional().nullable(),
  planId: z.coerce.number().int().positive().optional().nullable(),
  description: optionalText(255),
  quantity: z.coerce.number().positive(),
  unitPrice: moneySchema.optional().nullable(),
  discountAmount: moneySchema.optional().default(0),
});

export const quotationListSchema = basePaginationSchema.extend({
  status: z
    .enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
    .optional(),
  customerId: z.coerce.number().int().positive().optional(),
});

export const quotationCreateSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  templateId: z.coerce.number().int().positive().optional().nullable(),
  validityDays: z.coerce.number().int().min(1).max(365).default(30),
  notes: optionalText(2000),
  lines: z.array(quotationLineSchema).min(1, 'Add at least one line item.'),
});

export const quotationUpdateSchema = quotationCreateSchema.partial();

export const quotationConvertSchema = z.object({
  startDate: dateSchema.optional(),
  expiryDate: dateSchema.optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional().default(30),
  notes: optionalText(2000),
});

export const quotationEmailSchema = z.object({
  message: optionalText(1000),
});

export const quotationStatusSchema = z.object({
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED']),
});
