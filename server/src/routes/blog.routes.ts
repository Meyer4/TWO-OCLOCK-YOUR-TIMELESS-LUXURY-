import { Router } from 'express';
import { z } from 'zod';
import { BlogPost, type BlogDocument } from '../models/index.js';
import { requireAdmin } from '../middleware/authenticate.js';
import { conflict, notFound } from '../lib/errors.js';
import { slugify } from '../lib/format.js';
import { randomToken } from '../lib/crypto.js';
import { blogInput, blogPatch } from '../validators/commerce.schema.js';
import { idParam, pageQuery } from '../validators/common.js';

const router = Router();

const LIST_FIELDS = 'title slug excerpt coverImage category tags publishedAt';

router.get('/', async (req, res) => {
  const { page, limit } = pageQuery.parse(req.query);
  const { category } = z.object({ category: z.string().max(60).optional() }).parse(req.query);
  const filter: Record<string, unknown> = { status: 'published' };
  if (category) filter.category = category;
  const [items, total] = await Promise.all([
    BlogPost.find(filter)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(LIST_FIELDS)
      .lean(),
    BlogPost.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// Admin listing. Declared before '/:slug' so 'admin' is not treated as a slug.
router.get('/admin/list', requireAdmin, async (_req, res) => {
  const items = await BlogPost.find().sort({ updatedAt: -1 }).limit(200).lean();
  res.json({ items });
});

router.get('/:slug', async (req, res) => {
  const { slug } = z.object({ slug: z.string().min(1).max(200) }).parse(req.params);
  const post = await BlogPost.findOne({ slug: slug.toLowerCase(), status: 'published' }).select('-author').lean();
  if (!post) throw notFound('Article not found');
  res.json({ item: post });
});

async function uniqueSlug(title: string, given?: string): Promise<string> {
  let candidate = slugify(given ?? title);
  while (await BlogPost.exists({ slug: candidate })) {
    if (given) throw conflict('An article with this slug already exists');
    candidate = `${slugify(title)}-${randomToken(2)}`;
  }
  return candidate;
}

router.post('/', requireAdmin, async (req, res) => {
  const data = blogInput.parse(req.body);
  const slug = await uniqueSlug(data.title, data.slug);
  const post = await BlogPost.create({
    ...data,
    slug,
    author: req.auth!.id,
    publishedAt: data.status === 'published' ? new Date() : null,
  });
  res.status(201).json({ item: post });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = blogPatch.parse(req.body);
  const post: BlogDocument | null = await BlogPost.findById(id);
  if (!post) throw notFound('Article not found');
  if (data.slug && data.slug !== post.slug) data.slug = await uniqueSlug(data.title ?? post.title, data.slug);
  if (data.status === 'published' && post.status !== 'published') post.publishedAt = new Date();
  if (data.status === 'draft') post.publishedAt = null;
  post.set(data);
  await post.save();
  res.json({ item: post });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const removed = await BlogPost.findByIdAndDelete(id);
  if (!removed) throw notFound('Article not found');
  res.json({ ok: true });
});

export default router;
