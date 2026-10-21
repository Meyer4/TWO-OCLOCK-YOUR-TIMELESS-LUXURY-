import { z } from 'zod';
import { MAX_ITEMS_PER_ORDER, MAX_LINE_QUANTITY } from '../config/constants.js';
import { objectId, phoneSchema } from './common.js';
import { addressSchema } from './auth.schema.js';

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: objectId,
          quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
          size: z.string().trim().max(20).optional(),
          color: z.string().trim().max(40).optional(),
        }),
      )
      .min(1, 'Your cart is empty')
      .max(MAX_ITEMS_PER_ORDER),
    addressId: objectId.optional(),
    address: addressSchema.omit({ isDefault: true, label: true }).optional(),
    customerPhone: phoneSchema.optional(),
    shippingMethod: z.enum(['standard', 'express', 'pickup']),
    paymentMethod: z.enum(['stripe', 'airtel_money', 'mpamba', 'whatsapp']),
    couponCode: z.string().trim().max(40).optional(),
    redeemPoints: z.number().int().min(0).max(1_000_000).default(0),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.addressId || d.address, {
    message: 'Choose or enter a delivery address',
    path: ['addressId'],
  });

export const initiatePaymentSchema = z.object({
  orderId: objectId,
  provider: z.enum(['stripe', 'airtel_money', 'mpamba', 'whatsapp']),
});

export const manualConfirmSchema = z.object({
  reference: z.string().trim().min(3).max(120).optional(),
});

export const couponValidateSchema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.number().int().min(0).max(100_000_000),
});

const couponBase = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3-40 letters, numbers, dashes or underscores'),
  description: z.string().trim().max(300).optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0).max(100_000_000),
  minSpend: z.number().int().min(0).max(100_000_000).default(0),
  usageLimit: z.number().int().min(1).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
});

// Refinements cannot be made partial in Zod, so the base shape is split out and refined separately.
export const couponInput = couponBase.refine((d) => d.type !== 'percentage' || d.value <= 100, {
  message: 'Percentage must be 100 or less',
  path: ['value'],
});

export const couponPatch = couponBase
  .partial()
  .refine((d) => d.type !== 'percentage' || d.value === undefined || d.value <= 100, {
    message: 'Percentage must be 100 or less',
    path: ['value'],
  });

export const reviewCreateSchema = z.object({
  productId: objectId,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(3000),
  photos: z.array(z.url().max(2000)).max(5).default([]),
});

export const reviewModerationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const reviewListQuery = z.object({
  productId: objectId,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const wishlistAddSchema = z.object({ productId: objectId });

export const blogInput = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .max(200)
    .optional(),
  excerpt: z.string().trim().min(10).max(400),
  content: z.string().trim().min(20).max(100000),
  coverImage: z.url().max(2000).optional(),
  category: z.string().trim().min(2).max(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  seo: z
    .object({
      title: z.string().max(70).optional(),
      description: z.string().max(160).optional(),
      keywords: z.array(z.string().max(40)).max(15).optional(),
    })
    .optional(),
});

export const blogPatch = blogInput.partial();

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().max(254),
  phone: phoneSchema.optional(),
  message: z.string().trim().min(10).max(2000),
});

export const analyticsEventSchema = z.object({
  type: z.enum(['product_view', 'add_to_cart', 'checkout_started']),
  sessionId: z.string().trim().min(8).max(100),
  productId: objectId.optional(),
});
