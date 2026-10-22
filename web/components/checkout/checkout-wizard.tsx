'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { StripePayment } from './stripe-payment';
import { useMe, useAddresses } from '@/hooks/use-auth';
import { useCreateOrder, useInitiatePayment, usePaymentMethods, useValidateCoupon } from '@/hooks/use-store';
import { useCartSync } from '@/hooks/use-cart-sync';
import { useCart, cartTotals, lineKey } from '@/store/cart';
import { useHydrated } from '@/hooks/use-hydrated';
import { ApiError } from '@/lib/api';
import { formatMWK } from '@/lib/format';
import { estimateCoupon, estimateShipping, maxRedeemablePoints, POINT_VALUE_MWK, SHIPPING, type ShippingMethod } from '@/lib/pricing';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';
import type { Address, PaymentMethod } from '@/lib/types';

const STEPS = ['Contact', 'Delivery', 'Shipping', 'Payment', 'Review'] as const;
type PaymentId = PaymentMethod['id'];

interface AddressDraft {
  recipientName: string;
  phone: string;
  country: string;
  city: string;
  district: string;
  street: string;
}

const EMPTY_ADDRESS: AddressDraft = { recipientName: '', phone: '', country: 'Malawi', city: '', district: '', street: '' };

export function CheckoutWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const hydrated = useHydrated();
  const me = useMe();
  const addresses = useAddresses(Boolean(me.data));
  const methods = usePaymentMethods();
  const createOrder = useCreateOrder();
  const initiate = useInitiatePayment();
  const validateCoupon = useValidateCoupon();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const { count, subtotal } = cartTotals(items);
  useCartSync();

  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [addressChoice, setAddressChoice] = useState<string>('');
  const [newAddress, setNewAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [shipping, setShipping] = useState<ShippingMethod>('standard');
  const [payment, setPayment] = useState<PaymentId | ''>(() => (search.get('pay') === 'whatsapp' ? 'whatsapp' : ''));
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; type: 'percentage' | 'fixed'; value: number } | null>(null);
  const [points, setPoints] = useState(0);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [stripeSecret, setStripeSecret] = useState<{ orderId: string; clientSecret: string; amount: number } | null>(null);
  const [done, setDone] = useState<{ orderId: string; whatsappUrl: string | null } | null>(null);

  const savedAddresses: Address[] = addresses.data ?? [];
  const defaultAddressId = savedAddresses.find((a) => a.isDefault)?._id ?? savedAddresses[0]?._id ?? '';
  const selectedAddressId = addressChoice || defaultAddressId;
  const enabledMethods = (methods.data ?? []).filter((m) => m.enabled);

  const discount = coupon ? estimateCoupon(coupon.type, coupon.value, subtotal) : 0;
  const shippingFee = estimateShipping(shipping, subtotal);
  const payableBeforePoints = Math.max(0, subtotal - discount + shippingFee);
  const pointsCap = maxRedeemablePoints(me.data?.points ?? 0, payableBeforePoints);
  const pointsApplied = Math.min(points, pointsCap);
  const total = Math.max(0, payableBeforePoints - pointsApplied * POINT_VALUE_MWK);
  const pointsEarned = Math.floor(total / 1000);

  const methodSelected = useMemo(() => payment || enabledMethods[0]?.id || '', [payment, enabledMethods]);

  if (!hydrated || me.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Check className="mx-auto h-10 w-10 text-gold" aria-hidden />
        <h1 className="font-display mt-6 text-4xl">Thank you. Your order is in.</h1>
        <p className="mt-4 text-sm text-stone">We have reserved your pieces. You will receive updates as your order moves.</p>
        <div className="mt-10 flex flex-col items-center gap-4">
          {done.whatsappUrl ? (
            <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <MessageCircle className="h-4 w-4" /> Confirm on WhatsApp
            </a>
          ) : null}
          <Link href={`/account/orders/${done.orderId}`} className="text-xs uppercase tracking-[0.2em] text-gold">
            View your order
          </Link>
        </div>
      </div>
    );
  }

  if (stripeSecret) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Secure payment</p>
        <h1 className="font-display mt-2 text-4xl">Complete your payment</h1>
        <p className="mt-3 text-sm text-stone">Your pieces are reserved for 24 hours while you pay.</p>
        <div className="mt-10">
          <StripePayment clientSecret={stripeSecret.clientSecret} orderId={stripeSecret.orderId} amount={stripeSecret.amount} />
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl">Your bag is empty.</h1>
        <Link href="/shop" className="mt-6 inline-block text-xs uppercase tracking-[0.25em] text-gold">Continue shopping</Link>
      </div>
    );
  }

  const validateStep = (index: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (index === 0 && phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())) e.phone = 'Enter a valid phone number';
    if (index === 1) {
      if (savedAddresses.length > 0 && !addressChoice && !defaultAddressId) e.address = 'Choose a delivery address';
      if (savedAddresses.length === 0 || addressChoice === 'new') {
        if (newAddress.recipientName.trim().length < 2) e.recipientName = 'Enter the recipient name';
        if (!/^\+?[0-9 ()-]{7,20}$/.test(newAddress.phone.trim())) e.phone = 'Enter a valid phone number';
        if (newAddress.city.trim().length < 2) e.city = 'Enter the city';
        if (newAddress.district.trim().length < 2) e.district = 'Enter the district';
        if (newAddress.street.trim().length < 3) e.street = 'Enter the street address';
      }
    }
    if (index === 3 && !methodSelected) e.payment = 'Choose a payment method';
    return e;
  };

  const next = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const applyCoupon = () => {
    const code = couponInput.trim();
    if (!code) return;
    validateCoupon.mutate(
      { code, subtotal },
      {
        onSuccess: (res) => {
          setCoupon({ code: res.code, type: res.type, value: res.value });
          toast.success(res.description ?? `Coupon ${res.code} applied.`);
        },
        onError: (err) => {
          setCoupon(null);
          toast.error(err instanceof ApiError ? err.message : 'That coupon is not valid.');
        },
      },
    );
  };

  const buildBody = () => {
    const useSaved = savedAddresses.length > 0 && addressChoice !== 'new' && Boolean(selectedAddressId);
    return {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size, color: i.color })),
      ...(useSaved
        ? { addressId: selectedAddressId }
        : {
            address: {
              recipientName: newAddress.recipientName.trim(),
              phone: newAddress.phone.trim(),
              country: newAddress.country.trim() || 'Malawi',
              city: newAddress.city.trim(),
              district: newAddress.district.trim(),
              street: newAddress.street.trim(),
            },
          }),
      customerPhone: phone.trim() || undefined,
      shippingMethod: shipping,
      paymentMethod: methodSelected,
      couponCode: coupon?.code,
      redeemPoints: pointsApplied,
      notes: notes.trim() || undefined,
    };
  };

  const place = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      const { order, whatsappUrl } = await createOrder.mutateAsync(buildBody());
      clear();
      if (methodSelected === 'whatsapp') {
        // Opening WhatsApp may be blocked by the browser, so the confirmation screen keeps a link too.
        if (whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener');
        setDone({ orderId: order._id, whatsappUrl });
        return;
      }
      if (methodSelected === 'stripe') {
        const res = await initiate.mutateAsync({ orderId: order._id, provider: 'stripe' });
        if (!res.clientSecret) throw new ApiError(500, 'NO_SECRET', 'We could not start the card payment. Please try again from your order page.');
        setStripeSecret({ orderId: order._id, clientSecret: res.clientSecret, amount: res.amount });
        return;
      }
      // Mobile money: the order page shows the payment instructions and reference.
      router.push(`/account/orders/${order._id}?pay=1`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const summary = (
    <aside className="h-fit space-y-5 border border-ink-line p-6 lg:sticky lg:top-28">
      <p className="font-display text-2xl">Your order</p>
      <ul className="space-y-4">
        {items.map((i) => (
          <li key={lineKey(i.productId, i.size, i.color)} className="flex gap-3">
            <div className="relative h-14 w-14 shrink-0 bg-ink-soft">
              {i.image ? <Image src={i.image} alt="" fill sizes="56px" className="object-cover" /> : null}
            </div>
            <div className="flex-1 text-sm">
              <p>{i.name}</p>
              <p className="text-xs text-stone">{[i.size, i.color, `× ${i.quantity}`].filter(Boolean).join(' · ')}</p>
            </div>
            <p className="text-sm">{formatMWK(i.unitPrice * i.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-ink-line pt-4 text-sm">
        <Row label="Subtotal" value={formatMWK(subtotal)} />
        {discount > 0 ? <Row label={`Coupon ${coupon?.code}`} value={`− ${formatMWK(discount)}`} /> : null}
        <Row label="Delivery" value={shippingFee === 0 ? 'Free' : formatMWK(shippingFee)} />
        {pointsApplied > 0 ? <Row label={`Points (${pointsApplied})`} value={`− ${formatMWK(pointsApplied * POINT_VALUE_MWK)}`} /> : null}
      </dl>
      <div className="flex justify-between border-t border-ink-line pt-4">
        <span className="text-stone">Total</span>
        <span className="font-display text-2xl text-gold">{formatMWK(total)}</span>
      </div>
      <p className="text-xs text-stone">You will earn {pointsEarned} loyalty {pointsEarned === 1 ? 'point' : 'points'} on this order.</p>
    </aside>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <ol className="mb-12 flex flex-wrap gap-x-8 gap-y-3" aria-label="Checkout progress">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? 'step' : undefined}
              className={cn('flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]', i === step ? 'text-gold' : i < step ? 'text-ivory-dim hover:text-gold' : 'text-stone/60')}
            >
              <span className={cn('flex h-6 w-6 items-center justify-center border text-[10px]', i <= step ? 'border-gold' : 'border-ink-line')}>{i < step ? '✓' : i + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <section className="space-y-8" aria-live="polite">
          {step === 0 ? (
            <div className="space-y-6">
              <h1 className="font-display text-3xl">Contact details</h1>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Name" htmlFor="name"><Input id="name" value={me.data?.name ?? ''} readOnly disabled /></Field>
                <Field label="Email" htmlFor="email"><Input id="email" value={me.data?.email ?? ''} readOnly disabled /></Field>
              </div>
              <Field label="Phone for delivery updates (optional)" htmlFor="phone" error={errors.phone}>
                <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={me.data?.phone ?? '+265 …'} />
              </Field>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <h1 className="font-display text-3xl">Delivery address</h1>
              {savedAddresses.length > 0 ? (
                <fieldset className="space-y-3">
                  <legend className="sr-only">Saved addresses</legend>
                  {savedAddresses.map((a) => (
                    <label key={a._id} className={cn('flex cursor-pointer gap-4 border p-4 text-sm', selectedAddressId === a._id ? 'border-gold' : 'border-ink-line')}>
                      <input type="radio" name="address" className="mt-1 accent-[#c9a96e]" checked={selectedAddressId === a._id} onChange={() => setAddressChoice(a._id)} />
                      <span>
                        <span className="font-display text-base">{a.label ?? a.recipientName}</span>
                        <span className="block text-stone">{a.recipientName} · {a.street}, {a.district}, {a.city}, {a.country} · {a.phone}</span>
                      </span>
                    </label>
                  ))}
                  <label className={cn('flex cursor-pointer gap-4 border p-4 text-sm', addressChoice === 'new' ? 'border-gold' : 'border-ink-line')}>
                    <input type="radio" name="address" className="mt-1 accent-[#c9a96e]" checked={addressChoice === 'new'} onChange={() => setAddressChoice('new')} />
                    <span className="font-display text-base">Use a new address</span>
                  </label>
                </fieldset>
              ) : null}
              {errors.address ? <Notice tone="error">{errors.address}</Notice> : null}
              {savedAddresses.length === 0 || addressChoice === 'new' ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Recipient name" htmlFor="recipientName" error={errors.recipientName}>
                    <Input id="recipientName" autoComplete="name" value={newAddress.recipientName} onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })} />
                  </Field>
                  <Field label="Recipient phone" htmlFor="addrPhone" error={errors.phone}>
                    <Input id="addrPhone" type="tel" autoComplete="tel" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} />
                  </Field>
                  <Field label="City" htmlFor="city" error={errors.city}>
                    <Input id="city" autoComplete="address-level2" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} placeholder="Lilongwe" />
                  </Field>
                  <Field label="District" htmlFor="district" error={errors.district}>
                    <Input id="district" value={newAddress.district} onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })} placeholder="Lilongwe" />
                  </Field>
                  <Field label="Street and landmark" htmlFor="street" error={errors.street} className="sm:col-span-2">
                    <Input id="street" autoComplete="street-address" value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <h1 className="font-display text-3xl">Delivery method</h1>
              <fieldset className="space-y-3">
                <legend className="sr-only">Delivery method</legend>
                {(Object.keys(SHIPPING) as ShippingMethod[]).map((m) => {
                  const fee = estimateShipping(m, subtotal);
                  const label = { standard: 'Standard delivery', express: 'Express delivery (Lilongwe)', pickup: 'Store pickup (Lilongwe)' }[m];
                  const eta = { standard: '2–5 working days', express: 'Same or next day', pickup: 'Ready within 24 hours' }[m];
                  return (
                    <label key={m} className={cn('flex cursor-pointer items-center gap-4 border p-5', shipping === m ? 'border-gold' : 'border-ink-line')}>
                      <input type="radio" name="shipping" className="accent-[#c9a96e]" checked={shipping === m} onChange={() => setShipping(m)} />
                      <span className="flex-1">
                        <span className="font-display text-lg">{label}</span>
                        <span className="block text-xs text-stone">{eta}</span>
                      </span>
                      <span className="text-sm">{fee === 0 ? 'Free' : formatMWK(fee)}</span>
                    </label>
                  );
                })}
              </fieldset>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="font-display text-3xl">Payment</h1>
                {methods.isLoading ? <Skeleton className="h-32 w-full" /> : null}
                <fieldset className="space-y-3">
                  <legend className="sr-only">Payment method</legend>
                  {(methods.data ?? []).map((m) => (
                    <label key={m.id} className={cn('flex items-center gap-4 border p-5', !m.enabled && 'opacity-40', methodSelected === m.id ? 'border-gold' : 'border-ink-line', m.enabled && 'cursor-pointer')}>
                      <input type="radio" name="payment" className="accent-[#c9a96e]" disabled={!m.enabled} checked={methodSelected === m.id} onChange={() => setPayment(m.id)} />
                      <span className="flex-1 font-display text-lg">{m.label}</span>
                      {!m.enabled ? <span className="text-xs text-stone">Unavailable</span> : null}
                    </label>
                  ))}
                </fieldset>
                {errors.payment ? <Notice tone="error">{errors.payment}</Notice> : null}
                {methodSelected === 'airtel_money' || methodSelected === 'mpamba' ? (
                  <p className="text-xs text-stone">After you place the order, you will see the mobile money number and reference to pay.</p>
                ) : null}
                {methodSelected === 'whatsapp' ? <p className="text-xs text-stone">We will open WhatsApp with your order details so our team can confirm it with you.</p> : null}
              </div>

              <div className="space-y-4 border-t border-ink-line pt-8">
                <p className="eyebrow">Coupon</p>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Field label="Coupon code" htmlFor="coupon">
                      <Input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="WELCOME10" />
                    </Field>
                  </div>
                  <Button variant="outline" onClick={applyCoupon} disabled={validateCoupon.isPending || !couponInput.trim()}>Apply</Button>
                </div>
                {coupon ? (
                  <p className="text-sm text-gold">
                    {coupon.code} applied.{' '}
                    <button className="text-stone underline underline-offset-4" onClick={() => setCoupon(null)}>Remove</button>
                  </p>
                ) : null}
              </div>

              {me.data && me.data.points > 0 ? (
                <div className="space-y-3 border-t border-ink-line pt-8">
                  <p className="eyebrow">Loyalty points</p>
                  <p className="text-sm text-stone">You have {me.data.points} points. Each point is worth {formatMWK(POINT_VALUE_MWK)}. Up to half of your order can be paid with points.</p>
                  <div className="flex items-center gap-4">
                    <Input type="number" min={0} max={pointsCap} value={points} onChange={(e) => setPoints(Math.max(0, Math.min(pointsCap, Number(e.target.value) || 0)))} className="w-32" aria-label="Points to redeem" />
                    <button className="text-xs uppercase tracking-[0.2em] text-gold" onClick={() => setPoints(pointsCap)} disabled={pointsCap === 0}>Use maximum ({pointsCap})</button>
                  </div>
                </div>
              ) : null}

              <Field label="Order notes (optional)" htmlFor="notes">
                <Textarea id="notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-6">
              <h1 className="font-display text-3xl">Review and place order</h1>
              <dl className="grid gap-6 text-sm sm:grid-cols-3">
                <div>
                  <dt className="eyebrow mb-2">Delivering to</dt>
                  <dd className="text-ivory-dim">
                    {savedAddresses.length > 0 && addressChoice !== 'new' && selectedAddressId
                      ? (() => {
                          const a = savedAddresses.find((x) => x._id === selectedAddressId);
                          return a ? `${a.recipientName}, ${a.street}, ${a.district}, ${a.city}` : '—';
                        })()
                      : `${newAddress.recipientName}, ${newAddress.street}, ${newAddress.district}, ${newAddress.city}`}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow mb-2">Delivery</dt>
                  <dd className="text-ivory-dim">{{ standard: 'Standard', express: 'Express', pickup: 'Store pickup' }[shipping]}</dd>
                </div>
                <div>
                  <dt className="eyebrow mb-2">Payment</dt>
                  <dd className="text-ivory-dim">{(methods.data ?? []).find((m) => m.id === methodSelected)?.label ?? '—'}</dd>
                </div>
              </dl>
              <p className="text-xs text-stone">Final prices are confirmed by our server when you place the order. Stock is reserved for 24 hours until payment is received.</p>
              <Button size="lg" className="w-full sm:w-auto" onClick={place} disabled={placing}>
                {placing ? 'Placing order…' : `Place order · ${formatMWK(total)}`}
              </Button>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-ink-line pt-8">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
            {step < STEPS.length - 1 ? <Button onClick={next}>Continue</Button> : null}
          </div>
        </section>
        {summary}
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
