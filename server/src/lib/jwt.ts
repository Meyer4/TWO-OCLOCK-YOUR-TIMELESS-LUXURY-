import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from './errors.js';

export type Role = 'customer' | 'admin' | 'super_admin';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

const ISSUER = 'two-oclock-api';
const AUDIENCE = 'two-oclock-web';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as jwt.JwtPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.role !== 'string') throw new Error('Malformed token');
    return { sub: decoded.sub, role: decoded.role as Role };
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.');
  }
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as jwt.JwtPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.jti !== 'string') throw new Error('Malformed token');
    return { sub: decoded.sub, jti: decoded.jti };
  } catch {
    throw unauthorized('Session expired. Please sign in again.');
  }
}
