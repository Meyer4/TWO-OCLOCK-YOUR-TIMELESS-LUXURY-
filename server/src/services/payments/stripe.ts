import type { IncomingHttpHeaders } from 'node:http';
import { env } from '../../config/env.js';
import { AppError, badRequest, serviceUnavailable } from '../../lib/errors.js';
import { hmacSha256Hex, safeEqual } from '../../lib/crypto.js';
import type { InitiateContext, InitiateResult, PaymentAdapter, VerifiedWebhook } from './types.js';

const TOLERANCE_SECONDS = 300;

/**
 * Stripe card / Apple Pay / Google Pay via PaymentIntents.
 * Stripe does not settle MWK, so the amount is converted with STRIPE_MWK_RATE.
 */
export function toStripeMinorUnits(amountMWK: number, mwkPerUnit: number): number {
  return Math.round((amountMWK / mwkPerUnit) * 100);
}

export function fromStripeMinorUnits(minor: number, mwkPerUnit: number): number {
  return Math.round((minor / 100) * mwkPerUnit);
}

/** Verifies the `Stripe-Signature` header (t=timestamp,v1=hmac) with replay protection. */
export function verifyStripeSignature(rawBody: Buffer, header: string | undefined, secret: string, now = Date.now()): void {
  if (!header) throw badRequest('Missing Stripe signature');
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) throw badRequest('Malformed Stripe signature');
  if (Math.abs(now / 1000 - timestamp) > TOLERANCE_SECONDS) throw badRequest('Stale Stripe signature');
  const expected = hmacSha256Hex(secret, `${timestamp}.${rawBody.toString('utf8')}`);
  if (!safeEqual(expected, signature)) throw badRequest('Invalid Stripe signature');
}

export const stripeAdapter: PaymentAdapter = {
  id: 'stripe',

  isEnabled() {
    return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
  },

  async initiate(ctx: InitiateContext): Promise<InitiateResult> {
    if (!env.STRIPE_SECRET_KEY) throw serviceUnavailable('Card payments are not configured');
    const body = new URLSearchParams({
      amount: String(toStripeMinorUnits(ctx.amount, env.STRIPE_MWK_RATE)),
      currency: env.STRIPE_CURRENCY.toLowerCase(),
      description: `Order ${ctx.orderNumber}`,
      'metadata[reference]': ctx.reference,
      'metadata[orderNumber]': ctx.orderNumber,
      'metadata[orderId]': ctx.orderId,
      'automatic_payment_methods[enabled]': 'true',
    });
    if (ctx.customerEmail) body.set('receipt_email', ctx.customerEmail);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': ctx.reference,
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const data = (await response.json()) as { id?: string; client_secret?: string; error?: { message?: string } };
    if (!response.ok || !data.id || !data.client_secret) {
      throw new AppError(502, data.error?.message ?? 'Card payment could not be started', 'PAYMENT_PROVIDER_ERROR');
    }
    return { providerRef: data.id, clientSecret: data.client_secret };
  },

  verifyWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): VerifiedWebhook {
    if (!env.STRIPE_WEBHOOK_SECRET) throw serviceUnavailable('Stripe webhooks are not configured');
    const signature = headers['stripe-signature'];
    verifyStripeSignature(rawBody, typeof signature === 'string' ? signature : undefined, env.STRIPE_WEBHOOK_SECRET);

    const event = JSON.parse(rawBody.toString('utf8')) as {
      type: string;
      data: { object: { id: string; amount_received?: number; metadata?: Record<string, string> } };
    };
    const intent = event.data.object;
    const status =
      event.type === 'payment_intent.succeeded'
        ? 'succeeded'
        : event.type === 'payment_intent.payment_failed'
          ? 'failed'
          : 'ignored';
    return {
      reference: intent.metadata?.reference,
      providerRef: intent.id,
      status,
      amountMWK:
        intent.amount_received !== undefined
          ? fromStripeMinorUnits(intent.amount_received, env.STRIPE_MWK_RATE)
          : undefined,
      raw: { type: event.type, id: intent.id, amount_received: intent.amount_received },
    } satisfies VerifiedWebhook;
  },
};
