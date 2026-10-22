/**
 * Client-side ESTIMATES for display only. The server recalculates every amount on order
 * creation (see server/src/lib/pricing.ts) and is the source of truth.
 */
export const SHIPPING = {
  standard: { fee: 3000, freeOver: 150000 },
  express: { fee: 8000, freeOver: null },
  pickup: { fee: 0, freeOver: null },
} as const;

export type ShippingMethod = keyof typeof SHIPPING;

export const POINT_VALUE_MWK = 10;
export const MAX_POINTS_REDEEM_RATIO = 0.5;

export function estimateShipping(method: ShippingMethod, subtotal: number): number {
  const rule = SHIPPING[method];
  if (rule.freeOver !== null && subtotal >= rule.freeOver) return 0;
  return rule.fee;
}

export function estimateCoupon(type: 'percentage' | 'fixed', value: number, subtotal: number): number {
  const raw = type === 'percentage' ? Math.floor((subtotal * value) / 100) : value;
  return Math.max(0, Math.min(raw, subtotal));
}

export function maxRedeemablePoints(balance: number, payableBeforePoints: number): number {
  const cap = Math.floor((payableBeforePoints * MAX_POINTS_REDEEM_RATIO) / POINT_VALUE_MWK);
  return Math.max(0, Math.min(balance, cap));
}
