import { Router } from 'express';
import { z } from 'zod';
import { Category, Product } from '../models/index.js';
import { requireAdmin } from '../middleware/authenticate.js';
import { conflict, notFound } from '../lib/errors.js';
import { slugify } from '../lib/format.js';
import { categoryInput, categoryPatch } from '../validators/catalog.schema.js';
import { idParam } from '../validators/common.js';

const router = Router();

router.get('/', async (_req, res) => {
  const items = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ items });
});

router.get('/:slug', async (req, res) => {
  const { slug } = z.object({ slug: z.string().min(1).max(80) }).parse(req.params);
  const category = await Category.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();
  if (!category) throw notFound('Category not found');
  res.json({ item: category });
});

router.post('/', requireAdmin, async (req, res) => {
  const data = categoryInput.parse(req.body);
  const slug = data.slug ?? slugify(data.name);
  if (await Category.exists({ slug })) throw conflict('A category with this slug already exists');
  const category = await Category.create({ ...data, slug });
  res.status(201).json({ item: category });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = categoryPatch.parse(req.body);
  const category = await Category.findByIdAndUpdate(id, { $set: data }, { new: true });
  if (!category) throw notFound('Category not found');
  res.json({ item: category });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const inUse = await Product.exists({ category: id, isActive: true });
  if (inUse) throw conflict('Move or archive the products in this category first');
  const category = await Category.findByIdAndUpdate(id, { $set: { isActive: false } });
  if (!category) throw notFound('Category not found');
  res.json({ ok: true });
});

export default router;
