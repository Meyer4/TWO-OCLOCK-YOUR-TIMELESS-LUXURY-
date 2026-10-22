import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { optionalAuth } from '../middleware/authenticate.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { contactEmail } from '../lib/emailTemplates.js';
import { getStoreSettings } from '../services/settings.js';
import { createInAppNotification, sendEmailNotification } from '../services/notifications.js';
import { recordEvent } from '../services/analytics.js';
import { analyticsEventSchema, contactSchema } from '../validators/index.js';

export const miscRouter = Router();

miscRouter.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(dbState === 1 ? 200 : 503).json({ status: dbState === 1 ? 'ok' : 'degraded', db: dbState === 1 ? 'up' : 'down' });
});

/** Public storefront settings (no internal values). */
miscRouter.get('/settings', async (_req, res) => {
  const settings = await getStoreSettings();
  res.json({
    storeName: settings.storeName,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone ?? null,
    whatsappNumber: settings.whatsappNumber || null,
    maintenanceMode: settings.maintenanceMode,
    currency: 'MWK',
  });
});

miscRouter.post('/contact', contactLimiter, async (req, res) => {
  const data = contactSchema.parse(req.body);
  const settings = await getStoreSettings();
  const to = settings.supportEmail || env.STORE_SUPPORT_EMAIL;
  void sendEmailNotification({ to, type: 'contact', email: contactEmail(data) });
  await createInAppNotification({ type: 'contact', subject: `Enquiry from ${data.name}`, body: data.message });
  res.status(201).json({ message: 'Thank you. Our team will reply shortly.' });
});

miscRouter.post('/analytics/events', optionalAuth, async (req, res) => {
  const data = analyticsEventSchema.parse(req.body);
  await recordEvent(
    { type: data.type, sessionId: data.sessionId, productId: data.productId },
    req.auth?.id,
  );
  res.status(202).json({ ok: true });
});
