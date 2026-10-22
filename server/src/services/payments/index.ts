import { airtelMoneyAdapter, mpambaAdapter } from './mobileMoney.js';
import { stripeAdapter } from './stripe.js';
import type { PaymentAdapter } from './types.js';
import type { PaymentProvider } from '../../config/constants.js';
import { badRequest, serviceUnavailable } from '../../lib/errors.js';

const adapters: Partial<Record<PaymentProvider, PaymentAdapter>> = {
  stripe: stripeAdapter,
  airtel_money: airtelMoneyAdapter,
  mpamba: mpambaAdapter,
};

export function getAdapter(provider: PaymentProvider): PaymentAdapter {
  const adapter = adapters[provider];
  if (!adapter) throw badRequest('This payment method is not available');
  if (!adapter.isEnabled()) throw serviceUnavailable('This payment method is not enabled yet');
  return adapter;
}

export type { PaymentAdapter } from './types.js';
