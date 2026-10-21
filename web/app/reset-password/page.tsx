import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
