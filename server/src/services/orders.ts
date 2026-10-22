import { Types } from 'mongoose';
import { Address, Coupon, Order, Payment, Product, User, type OrderDocument, type ICoupon } from '../models/index.js';
import type { IOrderItem, PaymentStatus } from '../models/Order.js';
import {
  ADMIN_STATUS_TARGETS,
  MAX_ADDRESSES_PER_USER,
  MAX_LINE_QUANTITY,
  ORDER_TRANSITIONS,
  PAID_STATUSES,
  UNPAID_ORDER_EXPIRY_HOURS,
  UNPAID_STATUSES,
  type OrderStatus,
  type PaymentProvider,
  type ShippingMethodKey,
} from '../config/constants.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../lib/errors.js';
import { formatOrderNumber } from '../lib/format.js';
import { assertCouponUsable } from '../lib/coupons.js';
import {
  computeCouponDiscount,
  computeOrderTotal,
  computePointsRedemption,
  computeShipping,
  effectivePrice,
  pointsForAmount,
} from '../lib/pricing.js';
import { orderEmail } from '../lib/emailTemplates.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { nextSequence } from './counter.js';
import { convertReservationToSale, releaseReservation, reserveStock, restockSold } from './inventory.js';
import { grantReferralRewardsOnFirstPaidOrder, reducePointsFloor } from './loyalty.js';
import { sendEmailNotification } from './notifications.js';
import { getStoreSettings } from './settings.js';
import { buildWhatsAppOrderMessage, buildWhatsAppUrl } from '../lib/whatsapp.js';

export interface CreateOrderInput {
  items: Array<{ productId: string; quantity: number; size?: string | undefined; color?: string | undefined }>;
  addressId?: string | undefined;
  address?: {
    recipientName: string;
    country: string;
    city: string;
    district: string;
    street: string;
    phone: string;
  } | undefined;
  customerPhone?: string | undefined;
  shippingMethod: ShippingMethodKey;
  paymentMethod: Exclude<PaymentProvider, 'paypal' | 'manual'>;
  couponCode?: string | undefined;
  redeemPoints: number;
  notes?: string | undefined;
}

export interface CreateOrderResult {
  order: OrderDocument;
  whatsappUrl: string | null;
}

function trackingUrl(orderId: string): string {
  return `${env.CLIENT_ORIGIN.replace(/\/$/, '')}/orders/${orderId}`;
}

/** Merges duplicate lines (same product, size and colour) and enforces per-line limits. */
function mergeLines(items: CreateOrderInput['items']) {
  const merged = new Map<string, { productId: string; quantity: number; size?: string; color?: string }>();
  for (const item of items) {
    const key = [item.productId, item.size ?? '', item.color ?? ''].join('|');
    const existing = merged.get(key);
    const quantity = (existing?.quantity ?? 0) + item.quantity;
    if (quantity > MAX_LINE_QUANTITY) {
      throw badRequest(`You can order at most ${MAX_LINE_QUANTITY} of the same item`);
    }
    merged.set(key, {
      productId: item.productId,
      quantity,
      ...(item.size ? { size: item.size } : {}),
      ...(item.color ? { color: item.color } : {}),
    });
  }
  return [...merged.values()];
}

async function resolveAddress(userId: string, input: CreateOrderInput) {
  if (input.addressId) {
    const address = await Address.findOne({ _id: input.addressId, user: userId }).lean();
    if (!address) throw notFound('Delivery address not found');
    return {
      recipientName: address.recipientName,
      country: address.country,
      city: address.city,
      district: address.district,
      street: address.street,
      phone: address.phone,
    };
  }
  if (!input.address) throw badRequest('Choose or enter a delivery address');

  const count = await Address.countDocuments({ user: userId });
  if (count < MAX_ADDRESSES_PER_USER) {
    // Save inline addresses for next time. Failure here must not block checkout.
    await Address.create({ user: userId, ...input.address, isDefault: count === 0 }).catch(() => undefined);
  }
  return input.address;
}

/**
 * Creates an order. Prices, stock, coupons and points are all recalculated on the server;
 * client-supplied totals are never trusted.
 */
export async function createOrder(userId: string, input: CreateOrderInput): Promise<CreateOrderResult> {
  const user = await User.findById(userId).lean();
  if (!user || !user.isActive) throw unauthorized();

  const lines = mergeLines(input.items);
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  if (byId.size !== productIds.length) {
    throw badRequest('One or more items in your cart are no longer available');
  }

  const orderItems: IOrderItem[] = lines.map((line) => {
    const product = byId.get(line.productId)!;
    let size: string | undefined;
    let color: string | undefined;
    if (product.sizes.length > 0) {
      if (!line.size) throw badRequest(`Please select a size for ${product.name}`);
      if (!product.sizes.includes(line.size)) throw badRequest(`Size ${line.size} is not available for ${product.name}`);
      size = line.size;
    }
    if (product.colors.length > 0 && line.color) {
      if (!product.colors.includes(line.color)) throw badRequest(`Colour ${line.color} is not available for ${product.name}`);
      color = line.color;
    }
    if (product.stock < line.quantity) {
      throw conflict(
        product.stock > 0
          ? `Only ${product.stock} left of ${product.name}. Please update your cart.`
          : `${product.name} is out of stock. Please update your cart.`,
      );
    }
    return {
      product: product._id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      ...(product.images[0] ? { image: product.images[0] } : {}),
      unitPrice: effectivePrice(product),
      quantity: line.quantity,
      ...(size ? { size } : {}),
      ...(color ? { color } : {}),
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingAddress = await resolveAddress(userId, input);
  const shippingFee = computeShipping(input.shippingMethod, subtotal);

  let coupon: (ICoupon & { _id: Types.ObjectId }) | null = null;
  let couponDiscount = 0;
  if (input.couponCode) {
    coupon = await Coupon.findOne({ code: input.couponCode.toUpperCase() }).lean<ICoupon & { _id: Types.ObjectId }>();
    if (!coupon) throw badRequest('That coupon code is not recognised');
    assertCouponUsable(coupon, subtotal);
    couponDiscount = computeCouponDiscount(coupon, subtotal);
  }

  if (input.redeemPoints > user.points) {
    throw badRequest(`You have ${user.points} points available`);
  }
  const payableBeforePoints = Math.max(0, subtotal + shippingFee - couponDiscount);
  const { points: pointsRedeemed, discount: pointsDiscount } = computePointsRedemption({
    requested: input.redeemPoints,
    available: user.points,
    payableBeforePoints,
  });
  const total = computeOrderTotal({ subtotal, shippingFee, couponDiscount, pointsDiscount });

  const stockLines = orderItems.map((item) => ({ productId: item.product, quantity: item.quantity }));
  await reserveStock(stockLines);

  let pointsConsumed = 0;
  let couponConsumed = false;
  try {
    if (pointsRedeemed > 0) {
      const res = await User.updateOne(
        { _id: userId, points: { $gte: pointsRedeemed } },
        { $inc: { points: -pointsRedeemed } },
      );
      if (res.modifiedCount !== 1) throw conflict('Your points balance changed. Please review your order.');
      pointsConsumed = pointsRedeemed;
    }
    if (coupon) {
      const res = await Coupon.updateOne(
        {
          _id: coupon._id,
          isActive: true,
          $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
        },
        { $inc: { usedCount: 1 } },
      );
      if (res.modifiedCount !== 1) throw conflict('This coupon is no longer available');
      couponConsumed = true;
    }

    const now = new Date();
    const orderNumber = formatOrderNumber(await nextSequence('order'));
    const order = await Order.create({
      orderNumber,
      user: userId,
      status: 'pending',
      paymentStatus: 'unpaid' satisfies PaymentStatus,
      paymentProvider: input.paymentMethod,
      items: orderItems,
      customer: { name: user.name, email: user.email, phone: input.customerPhone ?? user.phone ?? shippingAddress.phone },
      shippingAddress,
      shippingMethod: input.shippingMethod,
      shippingFee,
      subtotal,
      couponCode: coupon?.code,
      couponDiscount,
      pointsRedeemed,
      pointsDiscount,
      total,
      inventoryState: 'reserved',
      statusHistory: [{ status: 'pending', at: now, note: 'Order placed' }],
      notes: input.notes,
      expiresAt: new Date(now.getTime() + UNPAID_ORDER_EXPIRY_HOURS * 60 * 60 * 1000),
    });

    void sendEmailNotification({
      to: user.email,
      type: 'order_confirmed',
      userId,
      email: orderEmail('confirmed', {
        name: user.name,
        orderNumber,
        total,
        trackingUrl: trackingUrl(String(order._id)),
      }),
    });

    let whatsappUrl: string | null = null;
    if (input.paymentMethod === 'whatsapp') {
      const settings = await getStoreSettings();
      const message = buildWhatsAppOrderMessage({
        storeName: settings.storeName,
        orderNumber,
        customerName: user.name,
        phone: order.customer.phone ?? '',
        address: `${shippingAddress.street}, ${shippingAddress.district}, ${shippingAddress.city}, ${shippingAddress.country}`,
        items: orderItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          size: i.size,
          color: i.color,
        })),
        subtotal,
        shippingFee,
        discount: couponDiscount + pointsDiscount,
        total,
      });
      whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, message);
    }
    return { order, whatsappUrl };
  } catch (err) {
    await releaseReservation(stockLines);
    if (pointsConsumed > 0) await User.updateOne({ _id: userId }, { $inc: { points: pointsConsumed } });
    if (couponConsumed && coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: -1 } });
    throw err;
  }
}

export function orderLines(order: { items: IOrderItem[] }): Array<{ productId: Types.ObjectId; quantity: number }> {
  return order.items.map((i) => ({ productId: i.product, quantity: i.quantity }));
}

/** Marks an unpaid order as paid. Idempotent: returns transitioned=false if it was already paid or cancelled. */
export async function markOrderPaid(
  orderId: Types.ObjectId | string,
  meta: { provider: PaymentProvider },
): Promise<{ order: OrderDocument | null; transitioned: boolean }> {
  const now = new Date();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: UNPAID_STATUSES } },
    {
      $set: {
        status: 'paid',
        paymentStatus: 'paid',
        paymentProvider: meta.provider,
        paidAt: now,
        inventoryState: 'sold',
        expiresAt: null,
      },
      $push: { statusHistory: { status: 'paid', at: now, note: `Payment confirmed (${meta.provider})` } },
    },
    { new: true },
  );
  if (!order) return { order: null, transitioned: false };

  await convertReservationToSale(orderLines(order));

  const earned = pointsForAmount(order.total);
  if (earned > 0) {
    await User.updateOne({ _id: order.user }, { $inc: { points: earned } });
    await Order.updateOne({ _id: order._id }, { $set: { pointsEarned: earned } });
    order.pointsEarned = earned;
  }
  await grantReferralRewardsOnFirstPaidOrder(order.user);

  const customer = await User.findById(order.user).select('name email').lean();
  if (customer) {
    void sendEmailNotification({
      to: customer.email,
      type: 'order_paid',
      userId: customer._id,
      email: orderEmail('paid', {
        name: customer.name,
        orderNumber: order.orderNumber,
        total: order.total,
        trackingUrl: trackingUrl(String(order._id)),
      }),
    });
  }
  return { order, transitioned: true };
}

/**
 * Cancels an unpaid order and undoes its side effects (stock, points, coupon usage).
 * `ownerId` restricts the cancel to the order owner; omit for system actions (expiry, admin).
 */
export async function cancelOrder(
  orderId: string,
  options: { ownerId?: string | undefined; reason: string },
): Promise<OrderDocument> {
  const filter: Record<string, unknown> = { _id: orderId };
  if (options.ownerId) filter.user = options.ownerId;
  const existing = await Order.findOne(filter).lean();
  if (!existing) throw notFound('Order not found');
  if (!UNPAID_STATUSES.includes(existing.status)) {
    throw conflict('This order can no longer be cancelled online. Please contact support.');
  }

  const now = new Date();
  const previous = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: UNPAID_STATUSES } },
    {
      $set: { status: 'cancelled', cancelledAt: now, inventoryState: 'released', expiresAt: null },
      $push: { statusHistory: { status: 'cancelled', at: now, note: options.reason } },
    },
    { new: false },
  );
  if (!previous) throw conflict('This order was just updated. Please refresh.');

  if (previous.inventoryState === 'reserved') await releaseReservation(orderLines(previous));
  if (previous.pointsRedeemed > 0) {
    await User.updateOne({ _id: previous.user }, { $inc: { points: previous.pointsRedeemed } });
  }
  if (previous.couponCode) {
    await Coupon.updateOne({ code: previous.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  }
  await Payment.updateMany({ order: previous._id, status: 'pending' }, { $set: { status: 'failed', failureReason: 'Order cancelled' } });

  return (await Order.findById(orderId))!;
}

/** Cancels orders whose payment window has passed. Called on a timer by the server. */
export async function expireStaleOrders(): Promise<number> {
  const stale = await Order.find({
    status: { $in: UNPAID_STATUSES },
    expiresAt: { $lt: new Date() },
  })
    .select('_id')
    .limit(200)
    .lean();
  let count = 0;
  for (const order of stale) {
    try {
      await cancelOrder(String(order._id), { reason: 'Payment window expired' });
      count += 1;
    } catch (err) {
      logger.warn({ err, orderId: String(order._id) }, 'Could not expire order');
    }
  }
  return count;
}

/** Admin status change for fulfilment steps. Payment and cancellation have their own flows. */
export async function updateOrderStatus(
  orderId: string,
  target: (typeof ADMIN_STATUS_TARGETS)[number],
  details: { note?: string | undefined; trackingNumber?: string | undefined; courier?: string | undefined },
): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) throw notFound('Order not found');
  if (!ADMIN_STATUS_TARGETS.includes(target)) throw badRequest('Use the dedicated endpoint for this status');
  const current: OrderStatus = order.status;
  if (!ORDER_TRANSITIONS[current].includes(target)) {
    throw badRequest(`An order cannot move from ${current} to ${target}`);
  }

  const now = new Date();
  const set: Record<string, unknown> = { status: target };
  if (target === 'shipped') set.shippedAt = now;
  if (target === 'delivered') set.deliveredAt = now;
  if (details.trackingNumber) set.trackingNumber = details.trackingNumber;
  if (details.courier) set.courier = details.courier;

  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: current },
    { $set: set, $push: { statusHistory: { status: target, at: now, note: details.note } } },
    { new: true },
  );
  if (!updated) throw conflict('This order was updated by someone else. Refresh and try again.');

  if (target === 'shipped' || target === 'delivered') {
    const customer = await User.findById(updated.user).select('name email').lean();
    if (customer) {
      void sendEmailNotification({
        to: customer.email,
        type: `order_${target}`,
        userId: customer._id,
        email: orderEmail(target, {
          name: customer.name,
          orderNumber: updated.orderNumber,
          total: updated.total,
          trackingUrl: trackingUrl(String(updated._id)),
          trackingNumber: updated.trackingNumber ?? undefined,
        }),
      });
    }
  }
  return updated;
}

/** Full refund: restocks sold units, reverses loyalty points and restores redeemed points. Money movement is recorded, not executed. */
export async function refundOrder(orderId: string, reason: string): Promise<OrderDocument> {
  const now = new Date();
  const previous = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: PAID_STATUSES } },
    {
      $set: { status: 'refunded', paymentStatus: 'refunded', refundedAt: now, inventoryState: 'restocked' },
      $push: { statusHistory: { status: 'refunded', at: now, note: reason } },
    },
    { new: false },
  );
  if (!previous) throw conflict('Only paid orders can be refunded');

  if (previous.inventoryState === 'sold') await restockSold(orderLines(previous));
  await reducePointsFloor(previous.user, previous.pointsEarned);
  if (previous.pointsRedeemed > 0) {
    await User.updateOne({ _id: previous.user }, { $inc: { points: previous.pointsRedeemed } });
  }
  await Payment.updateMany({ order: previous._id, status: 'succeeded' }, { $set: { status: 'refunded' } });

  const customer = await User.findById(previous.user).select('name email').lean();
  if (customer) {
    void sendEmailNotification({
      to: customer.email,
      type: 'refund_issued',
      userId: customer._id,
      email: orderEmail('refunded', {
        name: customer.name,
        orderNumber: previous.orderNumber,
        total: previous.total,
        trackingUrl: trackingUrl(String(previous._id)),
      }),
    });
  }
  return (await Order.findById(orderId))!;
}

export async function getOrderForUser(orderId: string, userId: string, role: string): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) throw notFound('Order not found');
  const isOwner = String(order.user) === userId;
  const isStaff = role === 'admin' || role === 'super_admin';
  if (!isOwner && !isStaff) throw forbidden();
  return order;
}

