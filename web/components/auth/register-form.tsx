'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice } from '@/components/ui/field';
import { useRegister } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { AuthShell } from './auth-shell';
import { safeNext } from './login-form';

export function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get('next'));
  const register = useRegister();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: (search.get('ref') ?? '').toUpperCase(),
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const body = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.referralCode.trim() ? { referralCode: form.referralCode.trim() } : {}),
    };
    register.mutate(body, {
      onSuccess: () => {
        router.replace(next);
        router.refresh();
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          setFieldErrors(err.fieldErrors);
          setError(err.message);
        } else setError('We could not create your account. Please try again.');
      },
    });
  };

  const field = (key: keyof typeof form, label: string, type = 'text', autoComplete?: string) => (
    <Field label={label} htmlFor={key} error={fieldErrors[key]}>
      <Input id={key} type={type} autoComplete={autoComplete} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </Field>
  );

  return (
    <AuthShell
      eyebrow="Join the house"
      title="Create account"
      footer={
        <>
          Already registered? <Link href="/login" className="text-gold hover:underline">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-7" noValidate>
        {field('name', 'Full name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field('phone', 'Phone (optional)', 'tel', 'tel')}
        {field('password', 'Password', 'password', 'new-password')}
        <p className="-mt-4 text-xs text-stone">At least 8 characters, with a letter and a number.</p>
        {field('confirmPassword', 'Confirm password', 'password', 'new-password')}
        {field('referralCode', 'Referral code (optional)')}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-xs text-stone">
          By creating an account you agree to our terms of service and privacy policy.
        </p>
      </form>
    </AuthShell>
  );
}
