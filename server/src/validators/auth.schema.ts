import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './common.js';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: phoneSchema.optional(),
    referralCode: z.string().trim().toUpperCase().max(12).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  recipientName: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(80).default('Malawi'),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  street: z.string().trim().min(3).max(240),
  phone: phoneSchema,
  isDefault: z.boolean().optional(),
});

export const addressPatchSchema = addressSchema.partial();
