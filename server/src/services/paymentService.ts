import { randomBytes } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { Types } from 'mongoose';
import { Order, Payment, type OrderDocument, type PaymentDocument } from '../models/index.js';
import { UNPAID_STATUSES, type PaymentProvider } from '../config/constants.js';
import { badRequest, conflict, notFound, forbidden } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { getAdapter } from './payments/index.js';
import { markOrderPaid } from './orders.js';

function newReference(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex').toUpperCase()}`;
}

/** Keeps only scalar fields from a provider payload so we store an audit trail without arbitrary nested data. */
function sanitizePayload(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    if (['string', 'number', 'boolean'].includes(typeof value)) out[key] = value;
  }
  return out;
}

function amountsMatch(reported: number, expected: number): boolean {
  return Math.abs(Math.round(reported) - Math.round(expected)) <= 1;
}

export async function initiatePayment(
  userId: string,
  input: { orderId: string; provider: Exclude<PaymentProvider, 'paypal' | 'manual'> },
): Promise<{
  paymentId: string;
  reference: string;
  provider: PaymentProvider;
  amount: number;
  clientSecret?: string | undefined;
  instructions?: string | undefined;
}> {
  const order = await Order.findById(input.orderId);
  if (!order) throw notFound('Order not found');
  if (String(order.user) !== userId) throw forbidden();
  if (!UNPAID_STATUSES.includes(order.status)) {
    throw conflict('This order is no longer awaiting payment');
  }

  const callbackUrl = `${env.CLIENT_ORIGIN.replace(/\/$/, '')}/orders/${order._id}`;

  if (input.provider === 'whatsapp') {
    const payment = await Payment.create({
      order: order._id,
      user: order.user,
      provider: 'whatsapp',
      reference: newReference('WA'),
      amount: order.total,
      currency: 'MWK',
      status: 'pending',
    });
    await Order.updateOne(
      { _id: order._id, status: { $in: UNPAID_STATUSES } },
      { $set: { paymentProvider: 'whatsapp', paymentStatus: 'pending' } },
    );
    return {
      paymentId: String(payment._id),
      reference: payment.reference,
      provider: 'whatsapp',
      amount: order.total,
      instructions: `Send your order ${order.orderNumber} on WhatsApp to confirm. We will verify payment with you there.`,
    };
  }

  const adapter = getAdapter(input.provider);
  const payment: PaymentDocument = await Payment.create({
    order: order._id,
    user: order.user,
    provider: input.provider,
    reference: newReference('PAY'),
    amount: order.total,
    currency: input.provider === 'stripe' ? env.STRIPE_CURRENCY.toUpperCase() : 'MWK',
    status: 'pending',
  });

  let result;
  try {
    result = await adapter.initiate({
      reference: payment.reference,
      amount: order.total,
      currency: 'MWK',
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerPhone: order.customer.phone,
      callbackUrl,
    });
  } catch (err) {
    await Payment.updateOne({ _id: payment._id }, { $set: { status: 'failed', failureReason: 'Could not start payment' } });
    throw err;
  }

  await Payment.updateOne({ _id: payment._id }, { $set: { providerRef: result.providerRef } });
  await Order.updateOne(
    { _id: order._id, status: { $in: UNPAID_STATUSES } },
    {
      $set: { status: 'awaiting_payment', paymentStatus: 'pending', paymentProvider: input.provider },
      $push: { statusHistory: { status: 'awaiting_payment', at: new Date(), note: `Payment started (${input.provider})` } },
    },
  );

  return {
    paymentId: String(payment._id),
    reference: payment.reference,
    provider: input.provider,
    amount: order.total,
    clientSecret: result.clientSecret,
    instructions: result.instructions,
  };
}

/**
 * Handles a provider webhook. Safe to receive duplicates: the payment transition is
 * conditional, and markOrderPaid is idempotent.
 */
export async function handleProviderWebhook(
  provider: PaymentProvider,
  rawBody: Buffer,
  headers: IncomingHttpHeaders,
): Promise<{ received: true; status: string }> {
  const adapter = getAdapter(provider);
  const event = adapter.verifyWebhook(rawBody, headers);
  if (event.status === 'ignored') return { received: true, status: 'ignored' };

  const lookup = event.reference
    ? { reference: event.reference, provider }
    : event.providerRef
      ? { providerRef: event.providerRef, provider }
      : null;
  if (!lookup) throw badRequest('Webhook has no payment reference');

  const payment = await Payment.findOne(lookup);
  if (!payment) {
    logger.warn({ provider, lookup }, 'Webhook for unknown payment');
    return { received: true, status: 'unknown_payment' };
  }

  if (event.amountMWK !== undefined && !amountsMatch(event.amountMWK, payment.amount)) {
    logger.error({ provider, reference: payment.reference, reported: event.amountMWK, expected: payment.amount }, 'Payment amount mismatch');
    await Payment.updateOne(
      { _id: payment._id, status: 'pending' },
      { $set: { status: 'failed', failureReason: 'Amount mismatch', providerPayload: sanitizePayload(event.raw) } },
    );
    return { received: true, status: 'amount_mismatch' };
  }

  if (event.status === 'succeeded') {
    await Payment.updateOne(
      { _id: payment._id, status: { $ne: 'succeeded' } },
      {
        $set: {
          status: 'succeeded',
          paidAt: new Date(),
          providerPayload: sanitizePayload(event.raw),
          ...(event.providerRef ? { providerRef: event.providerRef } : {}),
        },
      },
    );
    // Always attempt to mark the order paid: this self-heals if an earlier attempt failed part-way.
    const { order, transitioned } = await markOrderPaid(payment.order, { provider });
    if (!order) {
      const cancelled = await Order.findByIdAndUpdate(payment.order, {
        $push: { statusHistory: { status: 'cancelled', at: new Date(), note: 'Payment received after cancellation: refund required' } },
      });
      logger.error({ orderId: String(payment.order), cancelled: Boolean(cancelled) }, 'Payment received for a non-payable order');
      return { received: true, status: 'refund_required' };
    }
    return { received: true, status: transitioned ? 'paid' : 'already_paid' };
  }

  if (event.status === 'failed') {
    await Payment.updateOne(
      { _id: payment._id, status: 'pending' },
      { $set: { status: 'failed', failureReason: 'Provider reported failure', providerPayload: sanitizePayload(event.raw) } },
    );
    await Order.updateOne(
      { _id: payment.order, status: { $in: UNPAID_STATUSES } },
      { $set: { paymentStatus: 'failed' } },
    );
    return { received: true, status: 'failed' };
  }

  return { received: true, status: 'pending' };
}

/** Admin confirms an offline payment (WhatsApp or bank transfer) after checking funds. */
export async function confirmManualPayment(
  orderId: string,
  actorId: string,
  reference?: string,
): Promise<OrderDocument> {
  if (!Types.ObjectId.isValid(orderId)) throw badRequest('Invalid order id');
  const order = await Order.findById(orderId).lean();
  if (!order) throw notFound('Order not found');
  if (!UNPAID_STATUSES.includes(order.status)) throw conflict(`Order is already ${order.status}`);

  await Payment.create({
    order: order._id,
    user: order.user,
    provider: 'manual',
    reference: reference ?? newReference('MAN'),
    amount: order.total,
    currency: 'MWK',
    status: 'succeeded',
    paidAt: new Date(),
    providerPayload: { confirmedBy: actorId },
  });
  const { order: updated, transitioned } = await markOrderPaid(order._id, { provider: 'manual' });
  if (!transitioned || !updated) throw conflict('Order could not be marked as paid. Check its status.');
  return updated;
}
