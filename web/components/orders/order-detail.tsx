'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { StripePayment } from '@/components/checkout/stripe-payment';
import { CancelOrderButton } from '@/components/account/account-pages';
import { useInitiatePayment, useOrder } from '@/hooks/use-store';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatMWK, ORDER_STATUS_LABELS, PAYMENT_LABELS, SHIPPING_LABELS } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { toast } from '@/store/toast';

const TIMELINE: OrderStatus[] = ['pending', 'paid', 'processing', 'packing', 'shipped', 'delivered'];

export function OrderDetail({ orderId }: { orderId: string }) {
  const search = useSearchParams();
  const paidParam = search.get('paid') === '1';
  const payParam = search.get('pay') === '1';
  const order = useOrder(orderId, true);

  if (order.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (order.isError || !order.data) {
    return (
      <div className="border border-ink-line p-10 text-center">
        <p className="font-display text-2xl">We could not find that order.</p>
        <Link href="/account/orders" className="mt-4 inline-block text-sm text-gold">Back to your orders</Link>
      </div>
    );
  }

  const o = order.data;
  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="font-display mt-2 text-4xl">{o.orderNumber}</h1>
          <p className="mt-2 text-sm text-stone">Placed {formatDateTime(o.createdAt)}</p>
        </div>
        <Badge tone={o.status === 'cancelled' || o.status === 'refunded' ? 'danger' : 'gold'}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Badge>
      </header>

      {paidParam || (o.paymentStatus === 'paid' && payParam) ? <Notice tone="success">Thank you. Your payment is confirmed.</Notice> : null}

      <Timeline order={o} />

      {o.paymentStatus !== 'paid' && (o.status === 'pending' || o.status === 'awaiting_payment') ? (
        <PaymentPanel order={o} autoStart={payParam} />
      ) : null}

      <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
        <section>
          <p className="eyebrow mb-6">Items</p>
          <ul className="divide-y divide-ink-line border-y border-ink-line">
            {o.items.map((item, i) => (
              <li key={`${item.product}-${i}`} className="flex gap-4 py-5">
                <div className="relative h-20 w-20 shrink-0 bg-ink-soft">
                  {item.image ? <Image src={item.image} alt="" fill sizes="80px" className="object-cover" /> : null}
                </div>
                <div className="flex-1 text-sm">
                  <Link href={`/products/${item.slug}`} className="font-display text-lg hover:text-gold">{item.name}</Link>
                  <p className="text-xs text-stone">{[item.size && `Size ${item.size}`, item.color, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</p>
                </div>
                <p className="text-sm">{formatMWK(item.unitPrice * item.quantity)}</p>
              </li>
            ))}
          </ul>

          <dl className="ml-auto mt-8 max-w-sm space-y-2 text-sm">
            <Row label="Subtotal" value={formatMWK(o.subtotal)} />
            {o.couponDiscount > 0 ? <Row label={`Coupon ${o.couponCode ?? ''}`} value={`− ${formatMWK(o.couponDiscount)}`} /> : null}
            {o.pointsDiscount > 0 ? <Row label={`Loyalty points (${o.pointsRedeemed})`} value={`− ${formatMWK(o.pointsDiscount)}`} /> : null}
            <Row label={`Delivery · ${SHIPPING_LABELS[o.shippingMethod] ?? o.shippingMethod}`} value={o.shippingFee === 0 ? 'Free' : formatMWK(o.shippingFee)} />
            <div className="flex justify-between border-t border-ink-line pt-3">
              <dt className="text-stone">Total</dt>
              <dd className="font-display text-xl text-gold">{formatMWK(o.total)}</dd>
            </div>
            {o.pointsEarned > 0 ? <p className="pt-2 text-xs text-stone">Points earned on delivery: {o.pointsEarned}</p> : null}
          </dl>
        </section>

        <aside className="space-y-8 text-sm">
          <div>
            <p className="eyebrow mb-3">Delivery to</p>
            <p className="text-ivory-dim">{o.shippingAddress.recipientName}</p>
            <p className="text-stone">{o.shippingAddress.street}, {o.shippingAddress.district}, {o.shippingAddress.city}, {o.shippingAddress.country}</p>
            <p className="text-stone">{o.shippingAddress.phone}</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Payment</p>
            <p className="text-ivory-dim">{PAYMENT_LABELS[o.paymentProvider ?? ''] ?? '—'}</p>
            <p className="text-stone capitalize">{o.paymentStatus}</p>
          </div>
          {o.trackingNumber ? (
            <div>
              <p className="eyebrow mb-3">Tracking</p>
              <p className="text-ivory-dim">{o.courier ? `${o.courier} · ` : ''}{o.trackingNumber}</p>
            </div>
          ) : null}
          {o.status === 'pending' || o.status === 'awaiting_payment' ? <CancelOrderButton orderId={o._id} /> : null}
          <p className="text-xs text-stone">Questions? Message us on WhatsApp or <Link href="/contact" className="text-gold">contact support</Link>.</p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Timeline({ order }: { order: Order }) {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return <p className="text-sm text-stone">This order was {order.status}. {order.status === 'refunded' ? 'Your refund has been issued.' : ''}</p>;
  }
  const current = TIMELINE.indexOf(order.status === 'awaiting_payment' ? 'pending' : order.status);
  return (
    <ol className="grid gap-4 sm:grid-cols-6" aria-label="Order progress">
      {TIMELINE.map((s, i) => {
        const done = i <= current;
        const at = order.statusHistory?.find((h) => h.status === s)?.at;
        return (
          <li key={s} className={`border-t pt-4 text-[11px] uppercase tracking-[0.15em] ${done ? 'border-gold text-gold' : 'border-ink-line text-stone'}`}>
            <span className="flex items-center gap-2">
              {done ? <Check className="h-3 w-3" aria-hidden /> : null}
              {ORDER_STATUS_LABELS[s]}
            </span>
            {at ? <span className="mt-1 block normal-case tracking-normal text-stone">{formatDate(at)}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function PaymentPanel({ order, autoStart }: { order: Order; autoStart: boolean }) {
  const initiate = useInitiatePayment();
  const provider = order.paymentProvider;
  const [secret, setSecret] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<{ text: string; reference: string; amount: number } | null>(null);
  const started = useRef(false);

  const start = () => {
    if (!provider || provider === 'whatsapp') return;
    initiate.mutate(
      { orderId: order._id, provider: provider as 'stripe' | 'airtel_money' | 'mpamba' },
      {
        onSuccess: (res) => {
          if (res.clientSecret) setSecret(res.clientSecret);
          else setInstructions({ text: res.instructions ?? '', reference: res.reference, amount: res.amount });
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'We could not start the payment. Please try again.'),
      },
    );
  };

  // Mobile money orders arrive here straight from checkout: show the instructions immediately.
  useEffect(() => {
    if (autoStart && !started.current && provider && provider !== 'stripe' && provider !== 'whatsapp') {
      started.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, provider]);

  if (provider === 'whatsapp') {
    return <Notice>Your order is waiting for confirmation on WhatsApp. Our team will confirm the payment with you directly.</Notice>;
  }

  if (secret) {
    return (
      <section className="max-w-xl space-y-4 border border-ink-line p-6">
        <p className="font-display text-2xl">Pay by card</p>
        <StripePayment clientSecret={secret} orderId={order._id} amount={order.total} />
      </section>
    );
  }

  if (instructions) {
    return (
      <section className="max-w-xl space-y-4 border border-ink-line p-6">
        <p className="font-display text-2xl">{PAYMENT_LABELS[provider ?? ''] ?? 'Mobile money'}</p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ivory-dim">{instructions.text}</p>
        <p className="text-sm">Amount: <span className="text-gold">{formatMWK(instructions.amount)}</span></p>
        <p className="text-sm">Reference: <span className="font-mono text-ivory">{instructions.reference}</span></p>
        <p className="text-xs text-stone">Use this reference so we can match your payment. This page updates automatically once it is received.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-6 border border-gold/40 p-6">
      <div>
        <p className="font-display text-xl">Complete your payment</p>
        <p className="mt-1 text-sm text-stone">Your pieces are reserved while the order awaits payment.</p>
      </div>
      <Button onClick={start} disabled={initiate.isPending || !provider}>
        {initiate.isPending ? 'Preparing…' : provider === 'stripe' ? 'Pay by card' : 'Show payment details'}
      </Button>
    </section>
  );
}
