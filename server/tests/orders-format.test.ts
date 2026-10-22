import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMWK, formatOrderNumber, slugify, escapeRegex } from '../src/lib/format.js';
import { assertCouponUsable } from '../src/lib/coupons.js';
import { AppError } from '../src/lib/errors.js';

test('order numbers use the TL-000001 format', () => {
  assert.equal(formatOrderNumber(1), 'TL-000001');
  assert.equal(formatOrderNumber(42), 'TL-000042');
  assert.equal(formatOrderNumber(1234567), 'TL-1234567');
  assert.throws(() => formatOrderNumber(0), RangeError);
  assert.throws(() => formatOrderNumber(1.5), RangeError);
});

test('money is formatted in MWK with thousands separators', () => {
  assert.equal(formatMWK(1450000), 'MWK 1,450,000');
  assert.equal(formatMWK(99.6), 'MWK 100');
});

test('slugs are URL-safe and accent-free', () => {
  assert.equal(slugify('Calatrava Heritage Dress Watch!'), 'calatrava-heritage-dress-watch');
  assert.equal(slugify('Café Élégant'), 'cafe-elegant');
  assert.equal(slugify('Men & Women'), 'men-and-women');
  assert.equal(slugify('!!!'), '');
});

test('regex escaping neutralises metacharacters in search input', () => {
  const re = new RegExp(escapeRegex('a.*b(c)'));
  assert.equal(re.test('a.*b(c)'), true);
  assert.equal(re.test('axxbc'), false);
});

const coupon = {
  code: 'WELCOME10',
  type: 'percentage' as const,
  value: 10,
  minSpend: 50000,
  usageLimit: 2,
  usedCount: 0,
  startsAt: null,
  expiresAt: new Date('2030-01-01'),
  isActive: true,
};

test('valid coupons pass', () => {
  assert.doesNotThrow(() => assertCouponUsable(coupon, 60000, new Date('2026-06-01')));
});

test('coupons are rejected when inactive, expired, exhausted or under minimum spend', () => {
  const now = new Date('2026-06-01');
  assert.throws(() => assertCouponUsable({ ...coupon, isActive: false }, 60000, now), AppError);
  assert.throws(() => assertCouponUsable(coupon, 60000, new Date('2031-01-01')), /expired/);
  assert.throws(() => assertCouponUsable({ ...coupon, usedCount: 2 }, 60000, now), /usage limit/);
  assert.throws(() => assertCouponUsable(coupon, 1000, now), /minimum spend/);
  assert.throws(() => assertCouponUsable({ ...coupon, startsAt: new Date('2027-01-01') }, 60000, now), /not valid yet/);
});
