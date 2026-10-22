import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCouponDiscount,
  computeOrderTotal,
  computePointsRedemption,
  computeShipping,
  effectivePrice,
  pointsForAmount,
} from '../src/lib/pricing.js';

test('effectivePrice uses the sale price only when it is genuinely lower', () => {
  assert.equal(effectivePrice({ price: 100000, salePrice: 80000 }), 80000);
  assert.equal(effectivePrice({ price: 100000, salePrice: 100000 }), 100000);
  assert.equal(effectivePrice({ price: 100000, salePrice: 120000 }), 100000);
  assert.equal(effectivePrice({ price: 100000, salePrice: null }), 100000);
  assert.equal(effectivePrice({ price: 100000, salePrice: 0 }), 100000);
});

test('shipping is flat below the free threshold and free above it', () => {
  assert.equal(computeShipping('standard', 149999), 3000);
  assert.equal(computeShipping('standard', 150000), 0);
  assert.equal(computeShipping('express', 900000), 8000);
  assert.equal(computeShipping('pickup', 1), 0);
});

test('percentage coupons round down and never exceed the subtotal', () => {
  assert.equal(computeCouponDiscount({ type: 'percentage', value: 10 }, 99999), 9999);
  assert.equal(computeCouponDiscount({ type: 'percentage', value: 100 }, 5000), 5000);
});

test('fixed coupons are capped at the subtotal', () => {
  assert.equal(computeCouponDiscount({ type: 'fixed', value: 20000 }, 15000), 15000);
  assert.equal(computeCouponDiscount({ type: 'fixed', value: 5000 }, 15000), 5000);
});

test('points redemption is capped by balance and by 50% of the payable amount', () => {
  // 10 MWK per point. Payable 100,000 -> at most 50,000 of value -> 5,000 points.
  const capped = computePointsRedemption({ requested: 99999, available: 99999, payableBeforePoints: 100000 });
  assert.deepEqual(capped, { points: 5000, discount: 50000 });

  const byBalance = computePointsRedemption({ requested: 800, available: 300, payableBeforePoints: 100000 });
  assert.deepEqual(byBalance, { points: 300, discount: 3000 });

  const none = computePointsRedemption({ requested: 0, available: 300, payableBeforePoints: 100000 });
  assert.deepEqual(none, { points: 0, discount: 0 });
});

test('order totals never go negative', () => {
  assert.equal(
    computeOrderTotal({ subtotal: 10000, shippingFee: 3000, couponDiscount: 20000, pointsDiscount: 0 }),
    0,
  );
  assert.equal(
    computeOrderTotal({ subtotal: 185000, shippingFee: 3000, couponDiscount: 0, pointsDiscount: 1000 }),
    187000,
  );
});

test('loyalty: 1 point per MWK 1,000 spent, rounded down', () => {
  assert.equal(pointsForAmount(999), 0);
  assert.equal(pointsForAmount(1000), 1);
  assert.equal(pointsForAmount(25499), 25);
  assert.equal(pointsForAmount(-5), 0);
});
