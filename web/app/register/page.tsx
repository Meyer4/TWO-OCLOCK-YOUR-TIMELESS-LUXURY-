import { notFound } from 'next/navigation';
import { DEMO } from '@/lib/demo/mode';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default function RegisterPage() {
  if (DEMO) notFound();
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
