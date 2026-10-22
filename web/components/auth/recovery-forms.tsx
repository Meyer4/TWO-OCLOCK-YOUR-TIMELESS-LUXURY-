'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { AuthShell } from './auth-shell';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email: email.trim().toLowerCase() }, noRefresh: true });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Please try again in a moment.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell eyebrow="Account help" title="Reset password" footer={<Link href="/login" className="text-gold hover:underline">Back to sign in</Link>}>
      {message ? (
        <Notice tone="success">{message}</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-8">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, ...form }, noRefresh: true });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'This link is invalid or has expired.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell eyebrow="Account help" title="Choose a new password" footer={<Link href="/login" className="text-gold hover:underline">Back to sign in</Link>}>
      {!token ? (
        <Notice tone="error">This reset link is incomplete. Request a new one from the sign-in page.</Notice>
      ) : message ? (
        <Notice tone="success">{message}</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-8" noValidate>
          <Field label="New password" htmlFor="password">
            <Input id="password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <Input id="confirm" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmailPanel() {
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    api('/auth/verify-email', { method: 'POST', body: { token }, noRefresh: true })
      .then(() => setState({ ok: true, message: 'Your email is verified. Thank you.' }))
      .catch((err: unknown) => setState({ ok: false, message: err instanceof ApiError ? err.message : 'This link is invalid or has expired.' }));
  }, [token]);

  return (
    <AuthShell eyebrow="Email" title="Verify your email" footer={<Link href="/account" className="text-gold hover:underline">Go to your account</Link>}>
      {!token ? <Notice tone="error">This verification link is incomplete.</Notice> : null}
      {token && !state ? <p className="text-center text-sm text-stone">Verifying…</p> : null}
      {state ? <Notice tone={state.ok ? 'success' : 'error'}>{state.message}</Notice> : null}
    </AuthShell>
  );
}
