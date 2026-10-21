'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice } from '@/components/ui/field';
import { useLogin } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { AuthShell } from './auth-shell';

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/account';
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get('next'));
  const login = useLogin();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    login.mutate(
      { email: form.email.trim().toLowerCase(), password: form.password },
      {
        onSuccess: () => {
          router.replace(next);
          router.refresh();
        },
        onError: (err) => setError(err instanceof ApiError && err.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.'),
      },
    );
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      footer={
        <>
          New here? <Link href={`/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-gold hover:underline">Create an account</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-8" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-xs">
          <Link href="/forgot-password" className="text-stone hover:text-gold">Forgot your password?</Link>
        </p>
      </form>
    </AuthShell>
  );
}
