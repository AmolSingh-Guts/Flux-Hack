import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .max(190)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(9, 'Password must be longer than 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character.');

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format.');

export const optionalDateSchema = dateSchema.optional().nullable();

export const moneySchema = z.coerce
  .number()
  .min(0, 'Amount cannot be negative.')
  .max(9999999999.99);

export const positiveNumberSchema = z.coerce.number().positive();

export const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    // Preserve `undefined` for partial updates: an omitted field must not be
    // written as NULL, otherwise PATCH requests would wipe existing values.
    .transform((value) => (value === undefined ? undefined : value || null));

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const basePaginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(120).optional().default(''),
    sortBy: z.string().trim().max(50).optional(),
    sortOrder: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.enum(['ASC', 'DESC']))
      .optional()
      .default('DESC'),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .passthrough();

export const statusSchema = z.string().trim().min(1).max(40);

export const booleanSchema = z.boolean();

export const idListSchema = z.array(z.coerce.number().int().positive()).default([]);
