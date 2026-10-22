'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice, Select, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useHydrated } from '@/hooks/use-hydrated';
import { estimateShipping } from '@/lib/pricing';
import { formatMWK } from '@/lib/format';
import { buildOrderMessage, type OrderDetails } from '@/lib/order-message';
import { PAYPAL_CLIENT_ID, STORE, waLink } from '@/lib/store-config';
import { cartTotals, useCart } from '@/store/cart';
import { toast } from '@/store/toast';

const PAYMENT_OPTIONS = [
  'Airtel Money',
  'TNM Mpamba',
  'Cash on delivery / pick up',
  'PayPal',
] as const;

interface FormState {
  name: string;
  phone: string;
  method: 'delivery' | 'pickup';
  address: string;
  payment: string;
  notes: string;
}

const EMPTY: FormState = { name: '', phone: '', method: 'delivery', address: '', payment: PAYMENT_OPTIONS[0], notes: '' };

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.name.trim().length < 2) errors.name = 'Please enter your name.';
  if (form.phone.replace(/\D/g, '').length < 9) errors.phone = 'Enter a phone number we can reach you on.';
  if (form.method === 'delivery' && form.address.trim().length < 5) errors.address = 'Enter your delivery address or area.';
  return errors;
}

/** Order form for the static storefront: builds the order and sends it to the store on WhatsApp. */
export function WhatsAppCheckout() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const { count, subtotal } = cartTotals(items);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentLink, setSentLink] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="eyebrow">Checkout</p>
        <h1 className="font-display mt-3 text-4xl">Your bag is empty</h1>
        <p className="mt-4 text-sm text-stone">Add a piece to your bag, then come back to place your order.</p>
        <Link href="/shop" className="mt-8 inline-block text-xs uppercase tracking-[0.25em] text-gold hover:text-gold-bright">
          Continue shopping
        </Link>
      </div>
    );
  }

  const delivery = form.method === 'pickup' ? 0 : estimateShipping('standard', subtotal);
  const totals = { subtotal, delivery, total: subtotal + delivery };
  const details = (): OrderDetails => ({
    name: form.name.trim(),
    phone: form.phone.trim(),
    method: form.method,
    address: form.address.trim() || undefined,
    payment: form.payment,
    notes: form.notes.trim() || undefined,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const url = waLink(buildOrderMessage(items, totals, details()));
    setSentLink(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp with your order.');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <p className="eyebrow">Checkout</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">Place your order</h1>
        <p className="mt-3 max-w-xl text-sm text-stone">
          Send your order to {STORE.name} on WhatsApp. We confirm stock, delivery and payment with you there.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="space-y-7" noValidate>
          <Field label="Full name" htmlFor="co-name" error={errors.name}>
            <Input id="co-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone / WhatsApp number" htmlFor="co-phone" error={errors.phone}>
            <Input id="co-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-xs uppercase tracking-[0.2em] text-stone">Delivery</legend>
            <label className="flex items-center gap-3 text-sm">
              <input type="radio" name="method" checked={form.method === 'delivery'} onChange={() => setForm({ ...form, method: 'delivery' })} className="accent-[#c9a96e]" />
              Deliver to me (Lilongwe same or next day, nationwide by courier)
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="radio" name="method" checked={form.method === 'pickup'} onChange={() => setForm({ ...form, method: 'pickup' })} className="accent-[#c9a96e]" />
              I will pick up
            </label>
          </fieldset>

          {form.method === 'delivery' ? (
            <Field label="Delivery address or area" htmlFor="co-address" error={errors.address}>
              <Textarea id="co-address" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          ) : null}

          <Field label="How will you pay?" htmlFor="co-payment">
            <Select id="co-payment" value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })}>
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notes (optional)" htmlFor="co-notes">
            <Textarea id="co-notes" rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          <Button type="submit" size="lg" className="w-full">
            Send order on WhatsApp
          </Button>

          {sentLink ? (
            <Notice tone="success">
              Your order is ready in WhatsApp. If it did not open,{' '}
              <a href={sentLink} target="_blank" rel="noopener noreferrer" className="text-gold underline underline-offset-4">
                tap here to send it
              </a>
              .
            </Notice>
          ) : null}

          {form.payment === 'PayPal' ? <PayPalPanel form={form} totals={totals} itemsCount={count} buildDetails={details} errors={errors} /> : null}
        </form>

        <aside className="h-fit space-y-5 border border-ink-line p-6 lg:sticky lg:top-28">
          <p className="font-display text-2xl">Your order</p>
          <ul className="divide-y divide-ink-line text-sm">
            {items.map((item) => (
              <li key={item.key} className="flex justify-between gap-4 py-3">
                <span>
                  {item.name} <span className="text-stone">x{item.quantity}</span>
                  {item.size || item.color ? <span className="block text-xs text-stone">{[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(' · ')}</span> : null}
                </span>
                <span className="shrink-0">{formatMWK(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-ink-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{formatMWK(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-stone">Delivery</dt><dd>{delivery === 0 ? 'Free / pick up' : formatMWK(delivery)}</dd></div>
            <div className="flex justify-between border-t border-ink-line pt-3"><dt className="text-stone">Total</dt><dd className="font-display text-xl text-gold">{formatMWK(totals.total)}</dd></div>
          </dl>
          <p className="text-xs text-stone">Prices are in Malawi Kwacha (MWK). Delivery fees are confirmed on WhatsApp.</p>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PayPal (client-side). PayPal does not accept MWK, so the total is converted to USD at STORE.mwkPerUsd.
// ---------------------------------------------------------------------------

interface PayPalButtonsOptions {
  createOrder: (data: unknown, actions: { order: { create: (o: unknown) => Promise<string> } }) => Promise<string>;
  onApprove: (data: { orderID?: string }, actions: { order: { capture: () => Promise<{ id?: string; status?: string }> } }) => Promise<void>;
  onError?: (err: unknown) => void;
}
interface PayPalGlobal {
  Buttons: (options: PayPalButtonsOptions) => { render: (el: HTMLElement) => Promise<void> };
}

declare global {
  interface Window {
    paypal?: PayPalGlobal;
  }
}

function PayPalPanel({
  form,
  totals,
  itemsCount,
  buildDetails,
  errors,
}: {
  form: FormState;
  totals: { subtotal: number; delivery: number; total: number };
  itemsCount: number;
  buildDetails: () => OrderDetails;
  errors: Record<string, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const latest = useRef({ form, totals, itemsCount, buildDetails });
  useEffect(() => {
    latest.current = { form, totals, itemsCount, buildDetails };
  });
  const usd = (totals.total / STORE.mwkPerUsd).toFixed(2);

  useEffect(() => {
    if (!PAYPAL_CLIENT_ID || !containerRef.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.paypal || !containerRef.current) return;
      window.paypal
        .Buttons({
          createOrder: async (_data, actions) => {
            const current = latest.current;
            if (Object.keys(validate(current.form)).length > 0) {
              throw new Error('Please fill in your name, phone and delivery details first.');
            }
            return actions.order.create({
              purchase_units: [
                {
                  amount: { currency_code: 'USD', value: (current.totals.total / STORE.mwkPerUsd).toFixed(2) },
                  description: `${STORE.name} order (${current.itemsCount} item${current.itemsCount === 1 ? '' : 's'})`,
                },
              ],
            });
          },
          onApprove: async (data, actions) => {
            const captured = await actions.order.capture();
            const current = latest.current;
            const message = buildOrderMessage(
              useCart.getState().items,
              current.totals,
              { ...current.buildDetails(), payment: 'PayPal (paid)' },
              `PayPal transaction ID: ${captured.id ?? data.orderID ?? 'unknown'} (USD ${usd})`,
            );
            setStatus('Payment received. Thank you! Send the confirmation to us on WhatsApp so we can prepare your order.');
            window.open(waLink(message), '_blank', 'noopener,noreferrer');
          },
          onError: () => setStatus('PayPal could not complete the payment. Please try again or choose another payment method.'),
        })
        .render(containerRef.current);
    };
    if (window.paypal) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]');
      if (existing) {
        existing.addEventListener('load', render);
      } else {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture`;
        script.dataset.paypalSdk = 'true';
        script.onload = render;
        script.onerror = () => setStatus('PayPal could not load. Check your connection or choose another payment method.');
        document.body.appendChild(script);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [usd]);

  if (!PAYPAL_CLIENT_ID) {
    return <Notice tone="error">PayPal is not connected yet. Please choose another payment method or order on WhatsApp.</Notice>;
  }

  return (
    <div className="space-y-3 border border-ink-line p-5">
      <p className="text-sm text-ivory-dim">
        Pay with PayPal: about <span className="text-gold">USD {usd}</span> for {formatMWK(totals.total)}.
        {Object.keys(errors).length > 0 ? ' Fill in your details above first.' : ''}
      </p>
      <div ref={containerRef} />
      {status ? <Notice tone="success">{status}</Notice> : null}
    </div>
  );
}
