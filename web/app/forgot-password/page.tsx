import { notFound } from 'next/navigation';
import { DEMO } from '@/lib/demo/mode';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ForgotPasswordPage() {
  if (DEMO) notFound();
  return <ForgotPasswordForm />;
}
