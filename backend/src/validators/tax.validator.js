import { z } from 'zod';
import { basePaginationSchema, optionalText } from './common.validator.js';

export const taxListSchema = basePaginationSchema.extend({
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const taxCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  percentage: z.coerce.number().min(0).max(100),
  taxType: z.string().trim().min(2).max(50).default('GST'),
  description: optionalText(255),
  isActive: z.boolean().optional().default(true),
});

export const taxUpdateSchema = taxCreateSchema.partial();
