import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacSha256Hex(secret: string, payload: string | Buffer): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Constant-time comparison of two hex/utf8 strings. Returns false for different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
