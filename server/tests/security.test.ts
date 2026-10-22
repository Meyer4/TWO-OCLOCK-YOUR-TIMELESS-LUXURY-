import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripDangerousKeys } from '../src/middleware/sanitize.js';
import { hmacSha256Hex, randomToken, safeEqual, sha256Hex } from '../src/lib/crypto.js';
import { verifyStripeSignature } from '../src/services/payments/stripe.js';
import { createMobileMoneyAdapter } from '../src/services/payments/mobileMoney.js';
import { passwordProblems } from '../src/lib/password.js';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../src/lib/jwt.js';
import { AppError } from '../src/lib/errors.js';

test('NoSQL operator keys are removed recursively', () => {
  const malicious = { email: { $ne: null }, nested: { $where: 'x', ok: 1 }, 'a.b': 1, list: [{ $gt: 1, v: 2 }] };
  assert.deepEqual(stripDangerousKeys(malicious), { email: {}, nested: { ok: 1 }, list: [{ v: 2 }] });
});

test('prototype-pollution keys are removed', () => {
  const payload = JSON.parse('{"__proto__": {"isAdmin": true}, "name": "x"}');
  const clean = stripDangerousKeys(payload) as Record<string, unknown>;
  assert.equal(Object.prototype.hasOwnProperty.call(clean, '__proto__'), false);
  assert.equal(({} as Record<string, unknown>).isAdmin, undefined);
});

test('password policy: 8+ chars with a letter and a digit', () => {
  assert.deepEqual(passwordProblems('abcdefg1'), []);
  assert.ok(passwordProblems('short1').length > 0);
  assert.ok(passwordProblems('onlyletters').some((p) => p.includes('number')));
  assert.ok(passwordProblems('12345678').some((p) => p.includes('letter')));
});

test('access tokens round-trip and reject tampering', () => {
  const token = signAccessToken({ sub: '64b000000000000000000001', role: 'admin' });
  assert.deepEqual(verifyAccessToken(token), { sub: '64b000000000000000000001', role: 'admin' });
  const [h, p, s] = token.split('.');
  const forged = [h, Buffer.from(JSON.stringify({ sub: 'x', role: 'super_admin' })).toString('base64url'), s].join('.');
  assert.throws(() => verifyAccessToken(forged), AppError);
});

test('refresh tokens are not accepted as access tokens and vice versa', () => {
  const refresh = signRefreshToken({ sub: 'u1', jti: randomToken(8) });
  assert.throws(() => verifyAccessToken(refresh), AppError);
  const access = signAccessToken({ sub: 'u1', role: 'customer' });
  assert.throws(() => verifyRefreshToken(access), AppError);
});

test('Stripe webhook signatures: valid, tampered, stale and missing', () => {
  const secret = 'whsec_test';
  const body = Buffer.from('{"type":"payment_intent.succeeded"}');
  const now = Date.now();
  const t = Math.floor(now / 1000);
  const sig = hmacSha256Hex(secret, `${t}.${body.toString('utf8')}`);

  assert.doesNotThrow(() => verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, now));
  assert.throws(() => verifyStripeSignature(Buffer.from('{"type":"x"}'), `t=${t},v1=${sig}`, secret, now), /Invalid/);
  assert.throws(() => verifyStripeSignature(body, `t=${t},v1=${sig}`, 'wrong', now), /Invalid/);
  assert.throws(() => verifyStripeSignature(body, `t=${t - 3600},v1=${sig}`, secret, now), /Stale/);
  assert.throws(() => verifyStripeSignature(body, undefined, secret, now), /Missing/);
});

test('mobile money webhooks: HMAC required, status mapped, amount reported', () => {
  const adapter = createMobileMoneyAdapter({
    id: 'mpamba',
    label: 'Mpamba',
    baseUrl: undefined,
    apiKey: undefined,
    webhookSecret: 'mp-secret',
  });
  const body = Buffer.from(JSON.stringify({ reference: 'PAY-ABC', status: 'SUCCESSFUL', transactionId: 'tx1', amount: 185000 }));
  const sig = hmacSha256Hex('mp-secret', body);

  const ok = adapter.verifyWebhook(body, { 'x-signature': sig });
  assert.equal(ok.status, 'succeeded');
  assert.equal(ok.reference, 'PAY-ABC');
  assert.equal(ok.amountMWK, 185000);

  assert.throws(() => adapter.verifyWebhook(body, {}), /Missing/);
  assert.throws(() => adapter.verifyWebhook(body, { 'x-signature': 'deadbeef' }), /Invalid/);

  const failedBody = Buffer.from(JSON.stringify({ reference: 'PAY-X', status: 'FAILED' }));
  const failed = adapter.verifyWebhook(failedBody, { 'x-signature': hmacSha256Hex('mp-secret', failedBody) });
  assert.equal(failed.status, 'failed');
});

test('constant-time comparison and hashing helpers', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(sha256Hex('x').length, 64);
  assert.notEqual(randomToken(), randomToken());
});
