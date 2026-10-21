import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './common.js';

export const orderStatusUpdate = z.object({
  status: z.enum(['processing', 'packing', 'shipped', 'delivered']),
  note: z.string().trim().max(300).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
  courier: z.string().trim().max(60).optional(),
});

export const staffCreate = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['admin', 'super_admin']),
});

export const roleUpdate = z.object({
  role: z.enum(['customer', 'admin', 'super_admin']),
});

export const settingsPatch = z.object({
  storeName: z.string().trim().min(2).max(120).optional(),
  supportEmail: emailSchema.optional(),
  supportPhone: phoneSchema.optional(),
  whatsappNumber: z.string().regex(/^\d{7,15}$/, 'Digits only, international format').optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
  maintenanceMode: z.boolean().optional(),
});

export const periodQuery = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
});

export const reviewStatusQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export const orderListQuery = z.object({
  status: z
    .enum(['pending', 'awaiting_payment', 'paid', 'processing', 'packing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const uploadFolderQuery = z.object({
  folder: z.enum(['products', 'reviews', 'blog', 'marketing']).default('products'),
});
