import { badRequest } from './errors.js';
import { formatMWK } from './format.js';

export interface CouponRules {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  isActive: boolean;
}

/** Throws a 400 AppError if the coupon cannot be applied to a cart with this subtotal. */
export function assertCouponUsable(coupon: CouponRules, subtotal: number, now: Date = new Date()): void {
  if (!coupon.isActive) throw badRequest('This coupon is not active');
  if (coupon.startsAt && now < coupon.startsAt) throw badRequest('This coupon is not valid yet');
  if (coupon.expiresAt && now > coupon.expiresAt) throw badRequest('This coupon has expired');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw badRequest('This coupon has reached its usage limit');
  }
  if (subtotal < coupon.minSpend) {
    throw badRequest(`A minimum spend of ${formatMWK(coupon.minSpend)} is required for this coupon`);
  }
}
