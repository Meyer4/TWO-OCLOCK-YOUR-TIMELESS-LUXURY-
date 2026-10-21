'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/field';
import { formatMWK } from '@/lib/format';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!publishableKey) return null;
  stripePromise ??= loadStripe(publishableKey);
  return stripePromise;
}

/**
 * Mounts Stripe's Payment Element (card, Apple Pay, Google Pay, and other enabled methods)
 * for a PaymentIntent created by the server. Card data never touches our servers.
 */
export function StripePayment({ clientSecret, orderId, amount, onPaid }: { clientSecret: string; orderId: string; amount: number; onPaid?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const configError = publishableKey ? null : 'Card payments are not configured yet. Please choose another method or order on WhatsApp.';
  const error = configError ?? submitError;

  useEffect(() => {
    let cancelled = false;
    let mounted: { unmount: () => void } | null = null;
    const promise = getStripe();
    if (!promise) return;
    promise.then((stripe) => {
      if (cancelled || !stripe || !mountRef.current) return;
      const elements = stripe.elements({ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#c9a96e', borderRadius: '0px' } } });
      const element = elements.create('payment', { layout: 'tabs' });
      element.on('ready', () => setReady(true));
      element.mount(mountRef.current);
      elementsRef.current = { stripe, elements };
      mounted = { unmount: () => element.unmount() };
    });
    return () => {
      cancelled = true;
      mounted?.unmount();
      elementsRef.current = null;
    };
  }, [clientSecret]);

  const pay = async () => {
    const current = elementsRef.current;
    if (!current) return;
    setBusy(true);
    setSubmitError(null);
    const { error: confirmError, paymentIntent } = await current.stripe.confirmPayment({
      elements: current.elements,
      confirmParams: { return_url: `${window.location.origin}/account/orders/${orderId}?paid=1` },
      redirect: 'if_required',
    });
    setBusy(false);
    if (confirmError) {
      setSubmitError(confirmError.message ?? 'Payment could not be completed. Please try again.');
      return;
    }
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onPaid?.();
      router.push(`/account/orders/${orderId}?paid=1`);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div ref={mountRef} className="min-h-40" />
      {!ready && !error ? <p className="text-xs text-stone">Loading secure payment form…</p> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button size="lg" className="w-full" onClick={pay} disabled={!ready || busy}>
        {busy ? 'Processing…' : `Pay ${formatMWK(amount)}`}
      </Button>
      <p className="text-center text-xs text-stone">Payments are encrypted and processed by Stripe.</p>
    </div>
  );
}
