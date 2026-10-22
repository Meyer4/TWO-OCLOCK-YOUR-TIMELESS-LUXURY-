import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError, z } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isProd } from '../config/env.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ErrorBody = { error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } };
  res.status(404).json(body);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields',
        details: z.flattenError(err).fieldErrors,
      },
    };
    res.status(422).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message, details: err.details } };
    res.status(err.status).json(body);
    return;
  }

  const e = err as { type?: string; code?: number; status?: number; message?: string };
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  if (e?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large' } });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { code: 'BAD_ID', message: 'Invalid identifier' } });
    return;
  }
  if (e?.code === 11000) {
    res.status(409).json({ error: { code: 'DUPLICATE', message: 'That value already exists' } });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  const message = isProd ? 'Something went wrong. Please try again.' : e?.message ?? 'Internal error';
  res.status(500).json({ error: { code: 'INTERNAL', message } });
}
