import { notFound } from 'next/navigation';
import { DEMO } from '@/lib/demo/mode';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default function LoginPage() {
  if (DEMO) notFound();
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
