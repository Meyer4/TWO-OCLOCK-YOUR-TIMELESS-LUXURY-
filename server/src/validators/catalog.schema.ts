import { z } from 'zod';
import { objectId, pageQuery, priceSchema } from './common.js';

const specification = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(300),
});

export const productBase = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and dashes')
    .max(120)
    .optional(),
  description: z.string().trim().min(10).max(10000),
  shortDescription: z.string().trim().max(300).optional(),
  category: objectId,
  brand: z.string().trim().min(1).max(80),
  price: priceSchema,
  salePrice: priceSchema.nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  sku: z.string().trim().min(2).max(60),
  images: z.array(z.url().max(2000)).max(12).default([]),
  video: z.url().max(2000).nullable().optional(),
  sizes: z.array(z.string().trim().min(1).max(20)).max(50).default([]),
  colors: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  specifications: z.array(specification).max(30).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  isActive: z.boolean().default(true),
  seo: z
    .object({
      title: z.string().max(70).optional(),
      description: z.string().max(160).optional(),
    })
    .optional(),
});

export const productCreateSchema = productBase;
export const productUpdateSchema = productBase.partial();
export const stockUpdateSchema = z.object({ stock: z.number().int().min(0).max(1_000_000) });

export const productListQuery = pageQuery.extend({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  size: z.string().trim().max(20).optional(),
  color: z.string().trim().max(40).optional(),
  sort: z
    .enum(['featured', 'price-asc', 'price-desc', 'newest', 'rating', 'bestselling'])
    .default('featured'),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const categoryInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .max(80)
    .optional(),
  description: z.string().trim().max(1000).optional(),
  image: z.url().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const categoryPatch = categoryInput.partial();
