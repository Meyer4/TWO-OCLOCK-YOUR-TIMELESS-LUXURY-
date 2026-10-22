import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { logger } from './lib/logger.js';
import { expireStaleOrders } from './services/orders.js';
import { ensureBootstrapAdmin } from './services/bootstrap.js';

const EXPIRY_INTERVAL_MS = 15 * 60 * 1000;

async function main(): Promise<void> {
  await connectDb();
  await ensureBootstrapAdmin();

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
  });

  const expiry = setInterval(() => {
    expireStaleOrders()
      .then((n) => n > 0 && logger.info({ expired: n }, 'Expired unpaid orders'))
      .catch((err) => logger.error({ err }, 'Order expiry job failed'));
  }, EXPIRY_INTERVAL_MS);

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    clearInterval(expiry);
    server.close(() => {
      disconnectDb().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start API');
  process.exit(1);
});
