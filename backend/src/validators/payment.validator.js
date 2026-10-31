import { z } from 'zod';
import {
  basePaginationSchema,
  dateSchema,
  moneySchema,
  optionalText,
} from './common.validator.js';

export const paymentMethods = [
  'CASH',
  'BANK_TRANSFER',
  'UPI',
  'CARD',
  'OTHER',
];

export const paymentListSchema = basePaginationSchema.extend({
  paymentMethod: z.enum(paymentMethods).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  invoiceId: z.coerce.number().int().positive().optional(),
});

export const paymentCreateSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(paymentMethods),
  amount: moneySchema.refine((value) => value > 0, 'Payment amount must be greater than 0.'),
  paymentDate: dateSchema.optional(),
  transactionReference: optionalText(190),
  notes: optionalText(2000),
});

export const paymentEmailSchema = z.object({
  message: optionalText(1000),
});
