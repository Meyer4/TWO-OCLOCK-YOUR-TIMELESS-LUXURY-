import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckoutWizard } from '@/components/checkout/checkout-wizard';
import { RequireAuth } from '@/components/auth/require-auth';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <CheckoutWizard />
      </Suspense>
    </RequireAuth>
  );
}
