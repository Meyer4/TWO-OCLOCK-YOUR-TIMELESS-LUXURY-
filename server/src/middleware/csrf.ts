import type { NextFunction, Request, Response } from 'express';
import { isProd } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { randomToken, safeEqual } from '../lib/crypto.js';

/**
 * Double-submit CSRF protection. The `tl_csrf` cookie is readable by the browser
 * (not httpOnly) and must be echoed in the `x-csrf-token` header on every
 * state-changing request. Cross-site forms cannot read the cookie, so they cannot forge the header.
 */
export const CSRF_COOKIE = 'tl_csrf';
export const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, randomToken(24), {
      httpOnly: false,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }
  next();
}

export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  // Webhooks are authenticated by HMAC signature instead.
  if (req.path.startsWith('/api/payments/webhooks/')) return next();
  // Bearer-token API clients are not exposed to ambient cookie credentials.
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (typeof cookie !== 'string' || !header || !safeEqual(cookie, header)) {
    return next(new AppError(403, 'Security check failed. Refresh the page and try again.', 'CSRF_FAILED'));
  }
  next();
}
