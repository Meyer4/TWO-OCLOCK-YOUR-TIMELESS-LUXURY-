import { Router } from 'express';
import { z } from 'zod';
import { Notification, Order, Payment, Product, Review, Settings, User, type UserDocument } from '../models/index.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/authenticate.js';
import { conflict, badRequest, notFound } from '../lib/errors.js';
import { createUploadSignature } from '../lib/cloudinary.js';
import { escapeRegex } from '../lib/format.js';
import { hashPassword } from '../lib/password.js';
import { randomToken } from '../lib/crypto.js';
import { LOW_STOCK_THRESHOLD, ADMIN_STATUS_TARGETS } from '../config/constants.js';
import { getSalesAnalytics, getDashboardSummary, type Period } from '../services/analytics.js';
import { confirmManualPayment } from '../services/paymentService.js';
import { invalidateSettingsCache, getStoreSettings } from '../services/settings.js';
import { recalculateProductRating } from '../services/reviews.js';
import { refundOrder, updateOrderStatus } from '../services/orders.js';
import { publicUser } from '../services/serialize.js';
import { idParam, pageQuery } from '../validators/common.js';
import {
  orderListQuery,
  orderStatusUpdate,
  periodQuery,
  reviewStatusQuery,
  roleUpdate,
  settingsPatch,
  staffCreate,
  uploadFolderQuery,
} from '../validators/admin.schema.js';
import { manualConfirmSchema, reviewModerationSchema } from '../validators/commerce.schema.js';

const router = Router();
router.use(requireAdmin);

router.get('/dashboard', async (_req, res) => {
  res.json(await getDashboardSummary());
});

router.get('/analytics', async (req, res) => {
  const { period } = periodQuery.parse(req.query);
  res.json(await getSalesAnalytics(period as Period));
});

router.get('/orders', async (req, res) => {
  const q = orderListQuery.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ orderNumber: re }, { 'customer.email': re }, { 'customer.name': re }];
  }
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .select('-statusHistory')
      .lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
});

router.get('/orders/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const order = await Order.findById(id).lean();
  if (!order) throw notFound('Order not found');
  const payments = await Payment.find({ order: id }).sort({ createdAt: -1 }).lean();
  res.json({ order, payments });
});

router.patch('/orders/:id/status', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = orderStatusUpdate.parse(req.body);
  if (!ADMIN_STATUS_TARGETS.includes(data.status)) throw badRequest('Invalid status');
  const order = await updateOrderStatus(id, data.status, data);
  res.json({ order });
});

router.post('/orders/:id/confirm-payment', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { reference } = manualConfirmSchema.parse(req.body ?? {});
  const order = await confirmManualPayment(id, req.auth!.id, reference);
  res.json({ order });
});

// Refunds move money, so they are restricted to super admins.
router.post('/orders/:id/refund', requireSuperAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body);
  const order = await refundOrder(id, reason);
  res.json({ order, note: 'Refund recorded. Return the money through the original payment channel.' });
});

router.get('/payments', requireSuperAdmin, async (req, res) => {
  const { page, limit } = pageQuery.parse(req.query);
  const [items, total] = await Promise.all([
    Payment.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('order', 'orderNumber total status')
      .lean(),
    Payment.countDocuments(),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/customers', async (req, res) => {
  const { page, limit } = pageQuery.parse(req.query);
  const q = z.object({ q: z.string().trim().max(80).optional() }).parse(req.query);
  const filter: Record<string, unknown> = { role: 'customer' };
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name email phone points isActive emailVerified createdAt')
      .lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/reviews', async (req, res) => {
  const { status } = reviewStatusQuery.parse(req.query);
  const { page, limit } = pageQuery.parse(req.query);
  const filter: Record<string, unknown> = status ? { status } : {};
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('product', 'name slug')
      .populate('user', 'name email')
      .lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.patch('/reviews/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = reviewModerationSchema.parse(req.body);
  const review = await Review.findByIdAndUpdate(
    id,
    { $set: { status, moderatedBy: req.auth!.id, moderatedAt: new Date() } },
    { new: true },
  );
  if (!review) throw notFound('Review not found');
  await recalculateProductRating(review.product);
  res.json({ item: review });
});

router.delete('/reviews/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw notFound('Review not found');
  await recalculateProductRating(review.product);
  res.json({ ok: true });
});

router.get('/inventory', async (_req, res) => {
  const settings = await getStoreSettings();
  const threshold = settings.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
  const items = await Product.find({ isActive: true })
    .sort({ stock: 1 })
    .limit(300)
    .select('name sku brand stock reservedStock soldCount images')
    .lean();
  res.json({
    threshold,
    lowStock: items.filter((p) => p.stock <= threshold).length,
    items: items.map((p) => ({ ...p, isLow: p.stock <= threshold })),
  });
});

router.get('/notifications', async (_req, res) => {
  const items = await Notification.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json({ items, unread: await Notification.countDocuments({ status: 'unread' }) });
});

router.post('/notifications/:id/read', async (req, res) => {
  const { id } = idParam.parse(req.params);
  await Notification.updateOne({ _id: id }, { $set: { status: 'read' } });
  res.json({ ok: true });
});

router.get('/staff', requireSuperAdmin, async (_req, res) => {
  const items = await User.find({ role: { $in: ['admin', 'super_admin'] } })
    .select('name email role isActive createdAt')
    .lean();
  res.json({ items });
});

router.post('/staff', requireSuperAdmin, async (req, res) => {
  const data = staffCreate.parse(req.body);
  if (await User.exists({ email: data.email })) throw conflict('An account with this email already exists');
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    role: data.role,
    emailVerified: true,
    referralCode: randomToken(4).toUpperCase(),
  });
  res.status(201).json({ item: publicUser(user) });
});

router.patch('/users/:id/role', requireSuperAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { role } = roleUpdate.parse(req.body);
  if (id === req.auth!.id) throw badRequest('You cannot change your own role');
  const user: UserDocument | null = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true });
  if (!user) throw notFound('User not found');
  // Revoke sessions so the new role takes effect immediately.
  await User.updateOne({ _id: id }, { $set: { refreshSessions: [] } });
  res.json({ item: publicUser(user) });
});

router.patch('/users/:id/status', requireSuperAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  if (id === req.auth!.id) throw badRequest('You cannot disable your own account');
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isActive, ...(isActive ? {} : { refreshSessions: [] }) } },
    { new: true },
  );
  if (!user) throw notFound('User not found');
  res.json({ item: publicUser(user) });
});

router.get('/settings', async (_req, res) => {
  res.json({ settings: await getStoreSettings() });
});

router.patch('/settings', requireSuperAdmin, async (req, res) => {
  const data = settingsPatch.parse(req.body);
  await Settings.updateOne({ key: 'store' }, { $set: data }, { upsert: true });
  invalidateSettingsCache();
  res.json({ settings: await getStoreSettings() });
});

router.post('/uploads/signature', async (req, res) => {
  const { folder } = uploadFolderQuery.parse(req.query);
  res.json(createUploadSignature(`two-oclock/${folder}`));
});

export default router;
