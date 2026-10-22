import { Router } from 'express';
import { Review, Product } from '../models/index.js';
import { requireAuth } from '../middleware/authenticate.js';
import { forbidden, conflict, notFound } from '../lib/errors.js';
import { hasVerifiedPurchase } from '../services/reviews.js';
import { reviewCreateSchema, reviewListQuery } from '../validators/index.js';

const router = Router();

/** Shows the first name and last initial only, to protect customer privacy. */
function displayName(name: string | undefined): string {
  if (!name) return 'Verified customer';
  const [first, ...rest] = name.trim().split(/\s+/);
  const initial = rest.length ? ` ${rest[rest.length - 1]![0]!.toUpperCase()}.` : '';
  return `${first}${initial}`;
}

router.get('/', async (req, res) => {
  const q = reviewListQuery.parse(req.query);
  const filter = { product: q.productId, status: 'approved' as const };
  const [docs, total, product] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('user', 'name')
      .lean(),
    Review.countDocuments(filter),
    Product.findById(q.productId).select('rating reviewCount').lean(),
  ]);
  const items = docs.map((r) => ({
    id: String(r._id),
    rating: r.rating,
    title: r.title,
    body: r.body,
    photos: r.photos,
    verifiedPurchase: true,
    author: displayName((r.user as unknown as { name?: string } | null)?.name),
    createdAt: r.createdAt,
  }));
  res.json({
    items,
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
    summary: { rating: product?.rating ?? 0, reviewCount: product?.reviewCount ?? 0 },
  });
});

router.post('/', requireAuth, async (req, res) => {
  const data = reviewCreateSchema.parse(req.body);
  const product = await Product.exists({ _id: data.productId, isActive: true });
  if (!product) throw notFound('Product not found');

  const orderId = await hasVerifiedPurchase(req.auth!.id, data.productId);
  if (!orderId) throw forbidden('Only customers who have purchased this item can review it');

  const existing = await Review.exists({ product: data.productId, user: req.auth!.id });
  if (existing) throw conflict('You have already reviewed this product');

  const review = await Review.create({
    product: data.productId,
    user: req.auth!.id,
    order: orderId,
    rating: data.rating,
    title: data.title,
    body: data.body,
    photos: data.photos,
    status: 'pending',
  });
  res.status(201).json({
    item: { id: String(review._id), status: review.status },
    message: 'Thank you. Your review will appear once it has been approved.',
  });
});

export default router;
