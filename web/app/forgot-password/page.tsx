import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
