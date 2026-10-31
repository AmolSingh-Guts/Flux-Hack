import { z } from 'zod';
import {
  basePaginationSchema,
  idListSchema,
  moneySchema,
  optionalText,
} from './common.validator.js';

export const productListSchema = basePaginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  productType: z.string().trim().max(100).optional(),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(190),
  productType: z.string().trim().min(2).max(100),
  salesPrice: moneySchema,
  costPrice: moneySchema.default(0),
  description: optionalText(2000),
  notes: optionalText(2000),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  taxRuleIds: idListSchema,
});

export const productUpdateSchema = productCreateSchema.partial();

export const variantListSchema = basePaginationSchema.extend({
  productId: z.coerce.number().int().positive().optional(),
});

export const variantCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  brand: optionalText(150),
  additionalPrice: moneySchema.default(0),
  isActive: z.boolean().optional().default(true),
});

export const variantUpdateSchema = variantCreateSchema.partial();
