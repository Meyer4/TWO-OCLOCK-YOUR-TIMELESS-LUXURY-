import type { NextFunction, Request, Response } from 'express';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Recursively drops keys that could inject Mongo operators or pollute prototypes. */
export function stripDangerousKeys(value: unknown, depth = 0): unknown {
  if (depth > 12) return undefined;
  if (Array.isArray(value)) return value.map((item) => stripDangerousKeys(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key)) continue;
      clean[key] = stripDangerousKeys(child, depth + 1);
    }
    return clean;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body !== undefined) req.body = stripDangerousKeys(req.body);
  // Express 5 exposes req.query as a getter, so shadow it with a sanitised own property.
  Object.defineProperty(req, 'query', {
    value: stripDangerousKeys(req.query),
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
}
