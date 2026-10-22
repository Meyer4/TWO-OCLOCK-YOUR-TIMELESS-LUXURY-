'use client';

import { DEMO } from '@/lib/demo/mode';
import { waLink } from '@/lib/store-config';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice, Textarea } from '@/components/ui/field';
import { useStoreSettings } from '@/hooks/use-store';
import { api, ApiError } from '@/lib/api';
import { toast } from '@/store/toast';

export function ContactForm() {
  const settings = useStoreSettings();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError(null);
    if (DEMO) {
      const text = `Hello Two O'Clock, ${form.name.trim()} (${form.email.trim()}${form.phone.trim() ? `, ${form.phone.trim()}` : ''}):\n\n${form.message.trim()}`;
      window.open(waLink(text), '_blank', 'noopener,noreferrer');
      setSent('Opening WhatsApp with your message. We reply there as soon as we can.');
      return;
    }
    setPending(true);
    try {
      const res = await api<{ message: string }>('/contact', {
        method: 'POST',
        body: { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined },
      });
      setSent(res.message);
      toast.success('Message sent.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setError(err.message);
      } else setError('Your message could not be sent. Please try again.');
    } finally {
      setPending(false);
    }
  };

  if (sent) return <Notice tone="success">{sent}</Notice>;

  const whatsapp = settings.data?.whatsappNumber;
  return (
    <form onSubmit={submit} className="space-y-7" noValidate>
      <Field label="Name" htmlFor="cname" error={errors.name}><Input id="cname" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Email" htmlFor="cemail" error={errors.email}><Input id="cemail" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Phone (optional)" htmlFor="cphone" error={errors.phone}><Input id="cphone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Message" htmlFor="cmsg" error={errors.message}><Textarea id="cmsg" required minLength={10} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap items-center gap-6">
        <Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</Button>
        {whatsapp ? (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-[0.2em] text-gold">Chat on WhatsApp</a>
        ) : null}
      </div>
      {settings.data?.supportEmail ? <p className="text-xs text-stone">Or email {settings.data.supportEmail}</p> : null}
    </form>
  );
}
