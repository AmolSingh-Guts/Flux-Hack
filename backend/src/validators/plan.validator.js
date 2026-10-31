import { z } from 'zod';
import {
  basePaginationSchema,
  dateSchema,
  moneySchema,
  optionalText,
} from './common.validator.js';

const billingFrequency = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);

export const planListSchema = basePaginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  productId: z.coerce.number().int().positive().optional(),
  billingFrequency: billingFrequency.optional(),
});

export const planCreateSchema = z.object({
  name: z.string().trim().min(2).max(190),
  productId: z.coerce.number().int().positive(),
  billingFrequency,
  price: moneySchema.refine((value) => value > 0, 'Price must be greater than 0.'),
  minQuantity: z.coerce.number().int().min(1).default(1),
  startDate: dateSchema,
  endDate: dateSchema.optional().nullable(),
  autoClose: z.boolean().optional().default(true),
  allowEarlyClosure: z.boolean().optional().default(true),
  allowPause: z.boolean().optional().default(true),
  allowRenewal: z.boolean().optional().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  description: optionalText(2000),
});

export const planUpdateSchema = planCreateSchema.partial();

export const planOptionsSchema = z.object({
  search: z.string().trim().max(120).optional().default(''),
});
