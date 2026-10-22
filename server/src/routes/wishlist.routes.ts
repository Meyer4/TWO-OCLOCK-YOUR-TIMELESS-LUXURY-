import { Router } from 'express';
import { Types } from 'mongoose';
import { Product, Wishlist } from '../models/index.js';
import { requireAuth } from '../middleware/authenticate.js';
import { badRequest } from '../lib/errors.js';
import { objectId } from '../validators/common.js';
import { wishlistAddSchema } from '../validators/index.js';

const router = Router();
router.use(requireAuth);

const PRODUCT_FIELDS = 'name slug brand images price salePrice stock isActive';

router.get('/', async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.auth!.id }).populate('products', PRODUCT_FIELDS).lean();
  const items = (wishlist?.products ?? []).filter(
    (p): p is NonNullable<typeof p> & { isActive: boolean } => Boolean(p && (p as { isActive?: boolean }).isActive),
  );
  res.json({ items });
});

router.post('/', async (req, res) => {
  const { productId } = wishlistAddSchema.parse(req.body);
  const exists = await Product.exists({ _id: productId, isActive: true });
  if (!exists) throw badRequest('This product is no longer available');
  await Wishlist.updateOne(
    { user: req.auth!.id },
    { $addToSet: { products: new Types.ObjectId(productId) } },
    { upsert: true },
  );
  res.status(201).json({ ok: true });
});

router.delete('/:productId', async (req, res) => {
  const productId = objectId.parse(req.params.productId);
  await Wishlist.updateOne({ user: req.auth!.id }, { $pull: { products: new Types.ObjectId(productId) } });
  res.json({ ok: true });
});

/** Moves an item to the cart. The client adds it to the local cart, then this removes it from the wishlist. */
router.post('/:productId/move-to-cart', async (req, res) => {
  const productId = objectId.parse(req.params.productId);
  const product = await Product.findOne({ _id: productId, isActive: true }).select(PRODUCT_FIELDS).lean();
  if (!product) throw badRequest('This product is no longer available');
  await Wishlist.updateOne({ user: req.auth!.id }, { $pull: { products: new Types.ObjectId(productId) } });
  res.json({ item: product });
});

export default router;
