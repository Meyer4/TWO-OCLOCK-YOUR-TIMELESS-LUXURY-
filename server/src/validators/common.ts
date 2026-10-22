import { z } from 'zod';
import { passwordProblems } from '../lib/password.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
export const emailSchema = z.email('Enter a valid email address').trim().toLowerCase().max(254);
/** Malawi / regional phone numbers: optional +, digits, spaces, brackets, dashes. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');
export const passwordSchema = z
  .string()
  .max(128)
  .superRefine((value, ctx) => {
    for (const problem of passwordProblems(value)) ctx.addIssue({ code: 'custom', message: problem });
  });
export const priceSchema = z.number().int('Prices are whole kwacha').min(0).max(100_000_000);
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});
export const idParam = z.object({ id: objectId });
