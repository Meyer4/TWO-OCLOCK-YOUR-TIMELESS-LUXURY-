import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';

/**
 * Exercises the real middleware chain (CSRF, sanitising, validation, auth gates,
 * error envelope) without a database. Requests that would reach MongoDB are not made here.
 */
let server: Server;
let base: string;
const app = createApp();

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function getCookies(): Promise<{ cookie: string; csrf: string }> {
  const res = await fetch(`${base}/api/payments/methods`).catch(() => null);
  const set = res?.headers.getSetCookie?.() ?? [];
  const csrf = set.map((c) => c.match(/tl_csrf=([^;]+)/)?.[1]).find(Boolean) ?? '';
  return { cookie: `tl_csrf=${csrf}`, csrf };
}

test('unsafe API requests without a CSRF token are rejected with 403', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.co', password: 'x' }),
  });
  assert.equal(res.status, 403);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'CSRF_FAILED');
});

test('a mismatched CSRF header is rejected', async () => {
  const { cookie } = await getCookies();
  const res = await fetch(`${base}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie, 'x-csrf-token': 'not-the-token' },
  });
  assert.equal(res.status, 403);
});

test('the CSRF cookie is issued on first request and is not httpOnly', async () => {
  const res = await fetch(`${base}/api/health`);
  const set = res.headers.getSetCookie();
  const csrfCookie = set.find((c) => c.startsWith('tl_csrf='));
  assert.ok(csrfCookie, 'tl_csrf cookie should be set');
  assert.doesNotMatch(csrfCookie!, /HttpOnly/i);
  assert.match(csrfCookie!, /SameSite=Lax/i);
});

test('validation errors use the 422 envelope with field details', async () => {
  const { cookie, csrf } = await getCookies();
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': csrf },
    body: JSON.stringify({ name: 'A', email: 'not-an-email', password: 'short', confirmPassword: 'nope' }),
  });
  assert.equal(res.status, 422);
  const body = (await res.json()) as { error: { code: string; details: Record<string, string[]> } };
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.email?.length);
  assert.ok(body.error.details.password?.length);
});

test('protected endpoints require authentication', async () => {
  for (const path of ['/api/orders', '/api/wishlist', '/api/auth/me', '/api/admin/dashboard']) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 401, `${path} should be 401`);
  }
});

test('invalid bearer tokens are rejected', async () => {
  const res = await fetch(`${base}/api/orders`, { headers: { Authorization: 'Bearer not.a.jwt' } });
  assert.equal(res.status, 401);
});

test('unknown routes return a JSON 404 envelope', async () => {
  const res = await fetch(`${base}/api/does-not-exist`);
  assert.equal(res.status, 404);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('security headers are present and the framework fingerprint is removed', async () => {
  const res = await fetch(`${base}/api/does-not-exist`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(res.headers.get('strict-transport-security') ?? '', /max-age=/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('payment webhooks reject bad signatures without touching the database', async () => {
  const res = await fetch(`${base}/api/payments/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=bad' },
    body: '{"type":"payment_intent.succeeded"}',
  });
  assert.equal(res.status, 400);
});

test('unknown webhook providers are rejected', async () => {
  const res = await fetch(`${base}/api/payments/webhooks/bitcoin`, { method: 'POST', body: '{}' });
  assert.equal(res.status, 422);
});
