import type { NextFunction, Request, Response } from 'express';
import { unauthorized, forbidden } from '../lib/errors.js';
import { verifyAccessToken, type Role } from '../lib/jwt.js';

export const ACCESS_COOKIE = 'tl_access';

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  const cookie = req.cookies?.[ACCESS_COOKIE];
  return typeof cookie === 'string' ? cookie : undefined;
}

/** Requires a valid access token (cookie or bearer). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next(unauthorized());
  const payload = verifyAccessToken(token);
  req.auth = { id: payload.sub, role: payload.role };
  next();
}

/** Attaches the user when a valid token is present, but never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.auth = { id: payload.sub, role: payload.role };
    } catch {
      // Ignore invalid tokens on public endpoints.
    }
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden());
    next();
  };
}

export const requireAdmin = requireRole('admin', 'super_admin');
export const requireSuperAdmin = requireRole('super_admin');
