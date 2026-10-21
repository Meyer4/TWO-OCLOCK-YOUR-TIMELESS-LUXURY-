import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { hashPassword } from '../lib/password.js';
import { randomToken } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';

/**
 * Creates the first super admin from BOOTSTRAP_ADMIN_* when no super admin exists.
 * Safe to run on every start: it is a no-op once a super admin exists.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) return;
  if (await User.exists({ role: 'super_admin' })) return;
  await User.create({
    name: 'Store Owner',
    email: env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD),
    role: 'super_admin',
    emailVerified: true,
    referralCode: randomToken(4).toUpperCase(),
  });
  logger.info({ email: env.BOOTSTRAP_ADMIN_EMAIL }, 'Bootstrap super admin created');
}
