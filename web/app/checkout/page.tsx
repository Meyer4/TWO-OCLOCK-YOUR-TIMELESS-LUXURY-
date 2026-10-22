import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckoutWizard } from '@/components/checkout/checkout-wizard';
import { WhatsAppCheckout } from '@/components/checkout/whatsapp-checkout';
import { RequireAuth } from '@/components/auth/require-auth';
import { DEMO } from '@/lib/demo/mode';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  if (DEMO) return <WhatsAppCheckout />;
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <CheckoutWizard />
      </Suspense>
    </RequireAuth>
  );
}
