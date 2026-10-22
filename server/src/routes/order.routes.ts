import { Router } from 'express';
import { Order } from '../models/index.js';
import { requireAuth } from '../middleware/authenticate.js';
import { checkoutLimiter } from '../middleware/rateLimit.js';
import { cancelOrder, createOrder, getOrderForUser } from '../services/orders.js';
import { createOrderSchema, pageQuery } from '../validators/index.js';
import { idParam } from '../validators/common.js';

const router = Router();
router.use(requireAuth);

router.post('/', checkoutLimiter, async (req, res) => {
  const data = createOrderSchema.parse(req.body);
  const { order, whatsappUrl } = await createOrder(req.auth!.id, {
    ...data,
    address: data.address,
  });
  res.status(201).json({ order, whatsappUrl });
});

router.get('/', async (req, res) => {
  const { page, limit } = pageQuery.parse(req.query);
  const filter = { user: req.auth!.id };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-statusHistory -notes')
      .lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const order = await getOrderForUser(id, req.auth!.id, req.auth!.role);
  res.json({ order });
});

router.post('/:id/cancel', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const order = await cancelOrder(id, { ownerId: req.auth!.id, reason: 'Cancelled by customer' });
  res.json({ order });
});

export default router;
