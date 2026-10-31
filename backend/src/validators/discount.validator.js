import { z } from 'zod';
import {
  basePaginationSchema,
  dateSchema,
  idListSchema,
  moneySchema,
} from './common.validator.js';

export const discountListSchema = basePaginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
});

const discountBaseSchema = z.object({
  name: z.string().trim().min(2).max(190),
  discountType: z.enum(['FIXED', 'PERCENTAGE']),
  discountValue: moneySchema.refine(
    (value) => value > 0,
    'Discount value must be greater than 0.',
  ),
  minimumPurchase: moneySchema.default(0),
  minimumQuantity: z.coerce.number().int().min(1).default(1),
  startDate: dateSchema,
  endDate: dateSchema,
  maximumUsage: z.coerce.number().int().positive().optional().nullable(),
  scope: z.enum(['ALL', 'PRODUCTS', 'SUBSCRIPTIONS']).default('ALL'),
  isActive: z.boolean().optional().default(true),
  productIds: idListSchema,
  subscriptionIds: idListSchema,
});

function validateDiscount(value, context) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'End date cannot be before start date.',
    });
  }

  if (
    value.discountType === 'PERCENTAGE' &&
    value.discountValue !== undefined &&
    value.discountValue > 100
  ) {
    context.addIssue({
      code: 'custom',
      path: ['discountValue'],
      message: 'Percentage discounts cannot exceed 100%.',
    });
  }

  if (
    value.scope === 'PRODUCTS' &&
    value.productIds !== undefined &&
    value.productIds.length === 0
  ) {
    context.addIssue({
      code: 'custom',
      path: ['productIds'],
      message: 'Select at least one applicable product.',
    });
  }

  if (
    value.scope === 'SUBSCRIPTIONS' &&
    value.subscriptionIds !== undefined &&
    value.subscriptionIds.length === 0
  ) {
    context.addIssue({
      code: 'custom',
      path: ['subscriptionIds'],
      message: 'Select at least one applicable subscription.',
    });
  }
}

export const discountCreateSchema =
  discountBaseSchema.superRefine(validateDiscount);

export const discountUpdateSchema =
  discountBaseSchema.partial().superRefine(validateDiscount);
