import type { IncomingHttpHeaders } from 'node:http';
import type { PaymentProvider } from '../../config/constants.js';

export interface InitiateContext {
  reference: string;
  amount: number;
  currency: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | undefined;
  callbackUrl: string;
}

export interface InitiateResult {
  providerRef?: string | undefined;
  clientSecret?: string | undefined;
  instructions?: string | undefined;
}

export interface VerifiedWebhook {
  /** Our reference (mobile money) if the provider echoes it. */
  reference?: string | undefined;
  /** Provider's identifier (e.g. Stripe PaymentIntent id). */
  providerRef?: string | undefined;
  status: 'succeeded' | 'failed' | 'pending' | 'ignored';
  /** Amount in MWK when the provider reports it (Stripe is converted before comparison). */
  amountMWK?: number | undefined;
  raw: Record<string, unknown>;
}

export interface PaymentAdapter {
  readonly id: PaymentProvider;
  isEnabled(): boolean;
  initiate(ctx: InitiateContext): Promise<InitiateResult>;
  /** Throws an AppError if the signature is invalid. */
  verifyWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): VerifiedWebhook;
}
