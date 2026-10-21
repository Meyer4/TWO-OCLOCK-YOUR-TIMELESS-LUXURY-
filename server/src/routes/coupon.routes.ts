import { Router } from 'express';
import { Coupon } from '../models/index.js';
import { requireAdmin, requireAuth } from '../middleware/authenticate.js';
import { assertCouponUsable } from '../lib/coupons.js';
import { computeCouponDiscount } from '../lib/pricing.js';
import { notFound } from '../lib/errors.js';
import { couponInput, couponPatch, couponValidateSchema } from '../validators/commerce.schema.js';
import { idParam } from '../validators/common.js';

const router = Router();

/** Customer-facing check, shows the discount before checkout. Does not consume a use. */
router.post('/validate', requireAuth, async (req, res) => {
  const data = couponValidateSchema.parse(req.body);
  const coupon = await Coupon.findOne({ code: data.code.toUpperCase() }).lean();
  if (!coupon) throw notFound('That coupon code is not recognised');
  assertCouponUsable(coupon, data.subtotal);
  res.json({
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    description: coupon.description ?? null,
    discount: computeCouponDiscount(coupon, data.subtotal),
  });
});

router.get('/', requireAdmin, async (_req, res) => {
  const items = await Coupon.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const data = couponInput.parse(req.body);
  const coupon = await Coupon.create(data);
  res.status(201).json({ item: coupon });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = couponPatch.parse(req.body);
  const coupon = await Coupon.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  if (!coupon) throw notFound('Coupon not found');
  res.json({ item: coupon });
});

/** Deactivates rather than deletes, so historic orders keep a valid coupon reference. */
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const coupon = await Coupon.findByIdAndUpdate(id, { $set: { isActive: false } });
  if (!coupon) throw notFound('Coupon not found');
  res.json({ ok: true });
});

export default router;
