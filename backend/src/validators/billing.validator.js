import { z } from 'zod';
import {
  basePaginationSchema,
  dateSchema,
} from './common.validator.js';

export const billingRunSchema = z.object({
  date: dateSchema.optional(),
});

export const billingLogListSchema = basePaginationSchema.extend({
  status: z.enum(['SUCCESS', 'SKIPPED', 'ERROR']).optional(),
  subscriptionId: z.coerce.number().int().positive().optional(),
});
