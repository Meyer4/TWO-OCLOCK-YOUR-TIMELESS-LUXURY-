import { Types } from 'mongoose';
import { Order, Product, Review } from '../models/index.js';
import { PAID_STATUSES } from '../config/constants.js';

/** Verified purchase: the customer has a paid (or later-stage) order containing this product. */
export async function hasVerifiedPurchase(userId: string, productId: string): Promise<Types.ObjectId | null> {
  const order = await Order.findOne({
    user: userId,
    status: { $in: PAID_STATUSES },
    'items.product': productId,
  })
    .select('_id')
    .lean();
  return order?._id ?? null;
}

/** Recomputes the average rating from approved reviews only. */
export async function recalculateProductRating(productId: string | Types.ObjectId): Promise<void> {
  const [stats] = await Review.aggregate([
    { $match: { product: new Types.ObjectId(String(productId)), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        rating: stats ? Math.round(stats.avg * 10) / 10 : 0,
        reviewCount: stats?.count ?? 0,
      },
    },
  );
}
