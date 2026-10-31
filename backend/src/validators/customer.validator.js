import { z } from 'zod';
import {
  basePaginationSchema,
  emailSchema,
  optionalText,
  dateSchema,
} from './common.validator.js';

export const customerListSchema = basePaginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export const customerCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: emailSchema,
  phone: optionalText(40),
  companyName: optionalText(190),
  address: optionalText(255),
  city: optionalText(100),
  state: optionalText(100),
  country: z.string().trim().max(100).optional().default('India'),
  gstNumber: optionalText(50),
  registrationDate: dateSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional().default('ACTIVE'),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerOptionsSchema = z.object({
  search: z.string().trim().max(120).optional().default(''),
});
