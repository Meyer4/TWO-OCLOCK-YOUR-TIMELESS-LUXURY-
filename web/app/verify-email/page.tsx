import { notFound } from 'next/navigation';
import { DEMO } from '@/lib/demo/mode';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmailPanel } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Verify email', robots: { index: false } };

export default function VerifyEmailPage() {
  if (DEMO) notFound();
  return (
    <Suspense fallback={null}>
      <VerifyEmailPanel />
    </Suspense>
  );
}
