import { Router } from 'express';
import { z } from 'zod';
import { Product } from '../models/index.js';
import { requireAdmin } from '../middleware/authenticate.js';
import { badRequest, notFound } from '../lib/errors.js';
import {
  createProduct,
  featuredProducts,
  getProductBySlug,
  listProducts,
  productFacets,
  productsByIds,
  relatedAndSimilar,
  suggestProducts,
  trendingProducts,
  updateProduct,
} from '../services/catalog.js';
import { idParam, productCreateSchema, productListQuery, productUpdateSchema, stockUpdateSchema } from '../validators/index.js';
import { pageQuery } from '../validators/common.js';
import { Types } from 'mongoose';

const router = Router();

router.get('/', async (req, res) => {
  const q = productListQuery.parse(req.query);
  res.json(
    await listProducts({
      q: q.q,
      category: q.category,
      brand: q.brand,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      minRating: q.minRating,
      inStock: q.inStock,
      size: q.size,
      color: q.color,
      sort: q.sort,
      featured: q.featured,
      page: q.page,
      limit: q.limit,
    }),
  );
});

router.get('/facets', async (req, res) => {
  const q = z
    .object({ category: z.string().max(80).optional(), brand: z.string().max(80).optional(), q: z.string().max(120).optional() })
    .parse(req.query);
  res.json(await productFacets(q));
});

router.get('/suggest', async (req, res) => {
  const { q } = z.object({ q: z.string().trim().min(1).max(80) }).parse(req.query);
  res.json(await suggestProducts(q));
});

router.get('/featured', async (req, res) => {
  const { category, limit } = z
    .object({ category: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(24).default(8) })
    .parse(req.query);
  res.json({ items: await featuredProducts(category, limit) });
});

router.get('/trending', async (req, res) => {
  const { category, limit } = z
    .object({ category: z.string().max(80).optional(), limit: z.coerce.number().int().min(1).max(24).default(8) })
    .parse(req.query);
  res.json({ items: await trendingProducts(category, limit) });
});

router.get('/by-ids', async (req, res) => {
  const { ids } = z.object({ ids: z.string().max(1000) }).parse(req.query);
  res.json({ items: await productsByIds(ids.split(',').map((s) => s.trim())) });
});

// Admin: includes inactive products.
router.get('/manage/list', requireAdmin, async (req, res) => {
  const { page, limit, q } = pageQuery.extend({ q: z.string().trim().max(80).optional() }).parse(req.query);
  const filter: Record<string, unknown> = {};
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { sku: re }, { brand: re }];
  }
  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category', 'name slug')
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.post('/', requireAdmin, async (req, res) => {
  const data = productCreateSchema.parse(req.body);
  const product = await createProduct({ ...data, category: new Types.ObjectId(data.category) } as never);
  res.status(201).json({ item: product });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = productUpdateSchema.parse(req.body);
  const patch: Record<string, unknown> = { ...data };
  if (data.category) patch.category = new Types.ObjectId(data.category);
  const product = await updateProduct(id, patch as never);
  res.json({ item: product });
});

router.patch('/:id/stock', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { stock } = stockUpdateSchema.parse(req.body);
  const product = await Product.findByIdAndUpdate(id, { $set: { stock } }, { new: true });
  if (!product) throw notFound('Product not found');
  res.json({ item: product });
});

// Soft delete keeps order history intact.
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const product = await Product.findByIdAndUpdate(id, { $set: { isActive: false, featured: false, trending: false } }, { new: true });
  if (!product) throw notFound('Product not found');
  res.json({ ok: true });
});

router.get('/:slug/related', async (req, res) => {
  const { slug } = z.object({ slug: z.string().min(1).max(160) }).parse(req.params);
  const product = await Product.findOne({ slug: slug.toLowerCase(), isActive: true }).select('_id').lean();
  if (!product) throw badRequest('Product not found');
  res.json(await relatedAndSimilar(String(product._id)));
});

router.get('/:slug', async (req, res) => {
  const { slug } = z.object({ slug: z.string().min(1).max(160) }).parse(req.params);
  res.json({ item: await getProductBySlug(slug) });
});

export default router;
