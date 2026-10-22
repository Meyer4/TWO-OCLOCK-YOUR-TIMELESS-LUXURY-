import { Router } from 'express';
import { z } from 'zod';
import { PAYMENT_PROVIDERS, type PaymentProvider } from '../config/constants.js';
import { requireAuth } from '../middleware/authenticate.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { getAdapter } from '../services/payments/index.js';
import { getStoreSettings } from '../services/settings.js';
import { handleProviderWebhook, initiatePayment } from '../services/paymentService.js';
import { initiatePaymentSchema } from '../validators/index.js';

/** Public: which checkout payment methods are currently usable. */
export const paymentMethodsRouter = Router();

paymentMethodsRouter.get('/methods', async (_req, res) => {
  const settings = await getStoreSettings();
  const isEnabled = (provider: PaymentProvider) => {
    try {
      return getAdapter(provider).isEnabled();
    } catch {
      return false;
    }
  };
  res.json({
    methods: [
      { id: 'stripe', label: 'Card, Apple Pay & Google Pay', enabled: isEnabled('stripe') },
      { id: 'airtel_money', label: 'Airtel Money', enabled: isEnabled('airtel_money') },
      { id: 'mpamba', label: 'TNM Mpamba', enabled: isEnabled('mpamba') },
      { id: 'whatsapp', label: 'Order on WhatsApp', enabled: Boolean(settings.whatsappNumber) },
    ],
  });
});

/**
 * Provider callbacks. Mounted BEFORE the JSON body parser in app.ts, so req.body is the raw Buffer
 * needed for HMAC verification. Authenticated by signature, not by session.
 */
export const paymentWebhookRouter = Router();

paymentWebhookRouter.post('/:provider', async (req, res) => {
  const { provider } = z.object({ provider: z.enum(PAYMENT_PROVIDERS) }).parse(req.params);
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const result = await handleProviderWebhook(provider, body, req.headers);
  res.json(result);
});

/** Authenticated: starts a payment for one of the customer's orders. */
const router = Router();
router.use(requireAuth);

router.post('/initiate', paymentLimiter, async (req, res) => {
  const data = initiatePaymentSchema.parse(req.body);
  res.status(201).json(await initiatePayment(req.auth!.id, data));
});

export default router;
