import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { issueCsrfCookie, verifyCsrf } from './middleware/csrf.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { paymentWebhookRouter } from './routes/payment.routes.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    }),
  );
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      serializers: { req: (req) => ({ method: req.method, url: req.url }) },
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(issueCsrfCookie);
  app.use('/api', apiLimiter);

  // Webhooks need the untouched body for HMAC verification, so they are mounted before express.json().
  app.use('/api/payments/webhooks', express.raw({ type: '*/*', limit: '256kb' }), paymentWebhookRouter);

  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeInput);
  app.use(verifyCsrf);

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
