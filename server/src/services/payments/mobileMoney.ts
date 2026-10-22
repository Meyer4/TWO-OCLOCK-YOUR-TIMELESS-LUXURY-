import type { IncomingHttpHeaders } from 'node:http';
import { AppError, badRequest, serviceUnavailable } from '../../lib/errors.js';
import { hmacSha256Hex, safeEqual } from '../../lib/crypto.js';
import { env } from '../../config/env.js';
import type { PaymentProvider } from '../../config/constants.js';
import type { InitiateContext, InitiateResult, PaymentAdapter, VerifiedWebhook } from './types.js';

interface MobileMoneyConfig {
  id: Extract<PaymentProvider, 'airtel_money' | 'mpamba'>;
  label: string;
  baseUrl: string | undefined;
  apiKey: string | undefined;
  webhookSecret: string | undefined;
}

/**
 * Mobile-money adapter shared by Airtel Money and Mpamba.
 *
 * Flow: initiate -> customer approves the push prompt on their phone ->
 * provider calls our webhook -> we verify the HMAC signature and reference
 * and amount -> mark the order paid (idempotent).
 *
 * The push request body/path below is a documented placeholder. Confirm it
 * against the provider's developer portal before enabling in production.
 */
export function createMobileMoneyAdapter(config: MobileMoneyConfig): PaymentAdapter {
  return {
    id: config.id,

    isEnabled() {
      return Boolean(config.baseUrl && config.apiKey && config.webhookSecret);
    },

    async initiate(ctx: InitiateContext): Promise<InitiateResult> {
      if (!config.baseUrl || !config.apiKey) {
        throw serviceUnavailable(`${config.label} is not configured yet`);
      }
      if (!ctx.customerPhone) throw badRequest('Add a phone number to your profile to pay with mobile money');

      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/payments/push`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': ctx.reference,
        },
        body: JSON.stringify({
          reference: ctx.reference,
          msisdn: ctx.customerPhone.replace(/\D/g, ''),
          amount: ctx.amount,
          currency: ctx.currency,
          description: `Order ${ctx.orderNumber}`,
          callbackUrl: ctx.callbackUrl,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await response.json().catch(() => ({}))) as { transactionId?: string; message?: string };
      if (!response.ok) {
        throw new AppError(502, data.message ?? `${config.label} request failed`, 'PAYMENT_PROVIDER_ERROR');
      }
      return {
        providerRef: data.transactionId,
        instructions: `Check your phone and approve the ${config.label} payment request of MWK ${ctx.amount.toLocaleString('en-US')}.`,
      };
    },

    verifyWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): VerifiedWebhook {
      if (!config.webhookSecret) throw serviceUnavailable(`${config.label} webhooks are not configured`);
      const provided = headers['x-signature'];
      if (typeof provided !== 'string') throw badRequest('Missing webhook signature');
      const expected = hmacSha256Hex(config.webhookSecret, rawBody);
      if (!safeEqual(expected, provided.toLowerCase())) throw badRequest('Invalid webhook signature');

      const body = JSON.parse(rawBody.toString('utf8')) as {
        reference?: string;
        transactionId?: string;
        status?: string;
        amount?: number;
      };
      const status = (body.status ?? '').toUpperCase();
      const mapped: VerifiedWebhook['status'] = ['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(status)
        ? 'succeeded'
        : ['FAILED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(status)
          ? 'failed'
          : 'pending';
      return {
        reference: body.reference,
        providerRef: body.transactionId,
        status: mapped,
        amountMWK: typeof body.amount === 'number' ? body.amount : undefined,
        raw: { status: body.status, transactionId: body.transactionId, amount: body.amount },
      };
    },
  };
}

export const airtelMoneyAdapter = createMobileMoneyAdapter({
  id: 'airtel_money',
  label: 'Airtel Money',
  baseUrl: env.AIRTEL_MONEY_BASE_URL,
  apiKey: env.AIRTEL_MONEY_API_KEY,
  webhookSecret: env.AIRTEL_MONEY_WEBHOOK_SECRET,
});

export const mpambaAdapter = createMobileMoneyAdapter({
  id: 'mpamba',
  label: 'Mpamba',
  baseUrl: env.MPAMBA_BASE_URL,
  apiKey: env.MPAMBA_API_KEY,
  webhookSecret: env.MPAMBA_WEBHOOK_SECRET,
});
