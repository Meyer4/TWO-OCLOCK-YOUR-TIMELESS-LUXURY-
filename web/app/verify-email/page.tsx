import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmailPanel } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Verify email', robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPanel />
    </Suspense>
  );
}
