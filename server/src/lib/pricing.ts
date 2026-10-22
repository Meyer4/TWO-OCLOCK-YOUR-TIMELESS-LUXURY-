import { MAX_POINTS_REDEEM_RATIO, POINTS_EARN_PER_MWK, POINTS_VALUE_MWK, SHIPPING_METHODS, type ShippingMethodKey } from '../config/constants.js';

export interface PricedProduct {
  price: number;
  salePrice?: number | null;
}

/** The price a customer pays per unit. Server-side source of truth; never trust client prices. */
export function effectivePrice(product: PricedProduct): number {
  const sale = product.salePrice;
  if (sale != null && sale > 0 && sale < product.price) return Math.round(sale);
  return Math.round(product.price);
}

export function computeShipping(method: ShippingMethodKey, subtotal: number): number {
  const rule = SHIPPING_METHODS[method];
  if (rule.freeOver !== null && subtotal >= rule.freeOver) return 0;
  return rule.fee;
}

export function computeCouponDiscount(coupon: { type: 'percentage' | 'fixed'; value: number }, subtotal: number): number {
  if (coupon.type === 'percentage') {
    return Math.min(subtotal, Math.floor((subtotal * coupon.value) / 100));
  }
  return Math.min(subtotal, Math.round(coupon.value));
}

export function computePointsRedemption(input: {
  requested: number;
  available: number;
  payableBeforePoints: number;
}): { points: number; discount: number } {
  const maxByRatio = Math.floor((input.payableBeforePoints * MAX_POINTS_REDEEM_RATIO) / POINTS_VALUE_MWK);
  const points = Math.max(0, Math.min(input.requested, input.available, maxByRatio));
  return { points, discount: points * POINTS_VALUE_MWK };
}

export function computeOrderTotal(input: {
  subtotal: number;
  shippingFee: number;
  couponDiscount: number;
  pointsDiscount: number;
}): number {
  return Math.max(0, input.subtotal + input.shippingFee - input.couponDiscount - input.pointsDiscount);
}

/** 1 point per MWK 1,000 spent, rounded down. */
export function pointsForAmount(amount: number): number {
  return Math.max(0, Math.floor(amount / POINTS_EARN_PER_MWK));
}
