'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Stars } from '@/components/ui/stars';
import { useAdminCustomers, useAdminReviews, useDeactivateCoupon, useInventory, useModerateReview, useSaveCoupon, useUpdateStock, useAdminCoupons } from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-auth';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatMWK } from '@/lib/format';
import { toast } from '@/store/toast';
import type { Coupon, StoreSettings } from '@/lib/types';
import { AdminHeader, StatCard, Td, Th, TableShell } from './admin-shell';
import { useStoreSettings } from '@/hooks/use-store';

// ---------- Inventory ----------
export function AdminInventory() {
  const inv = useInventory();
  const update = useUpdateStock();
  const [edits, setEdits] = useState<Record<string, string>>({});
  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Stock" title="Inventory" />
      {inv.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {inv.data ? (
        <>
          <div className="grid gap-px bg-ink-line sm:grid-cols-2">
            <StatCard label={`Low stock (≤ ${inv.data.threshold})`} value={inv.data.lowStock} tone={inv.data.lowStock ? 'danger' : undefined} />
            <StatCard label="Products tracked" value={inv.data.items.length} />
          </div>
          <TableShell>
            <thead><tr><Th>Product</Th><Th className="text-right">On hand</Th><Th className="text-right">Reserved</Th><Th className="text-right">Sold</Th><Th>Set stock</Th></tr></thead>
            <tbody>
              {inv.data.items.map((p) => (
                <tr key={p._id}>
                  <Td><span className={p.isLow ? 'text-danger' : 'text-ivory'}>{p.name}</span><span className="block text-xs text-stone">{p.sku}</span></Td>
                  <Td className="text-right">{p.stock}</Td>
                  <Td className="text-right">{p.reservedStock}</Td>
                  <Td className="text-right">{p.soldCount}</Td>
                  <Td>
                    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(edits[p._id] ?? p.stock); update.mutate({ id: p._id, stock: v }, { onSuccess: () => toast.success('Stock updated.'), onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update stock.') }); }}>
                      <Input aria-label={`Stock for ${p.name}`} type="number" min={0} className="w-24 py-2" value={edits[p._id] ?? p.stock} onChange={(e) => setEdits({ ...edits, [p._id]: e.target.value })} />
                      <Button type="submit" size="sm" variant="outline">Save</Button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </>
      ) : null}
    </div>
  );
}

// ---------- Reviews ----------
export function AdminReviews() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const reviews = useAdminReviews(status);
  const moderate = useModerateReview();
  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Moderation" title="Reviews" />
      <div className="flex gap-6 text-xs uppercase tracking-[0.2em]">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={status === s ? 'text-gold' : 'text-stone hover:text-ivory'}>{s}</button>
        ))}
      </div>
      {reviews.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      <ul className="divide-y divide-ink-line border-y border-ink-line">
        {reviews.data?.items.map((r) => {
          const review = r as unknown as { _id: string; rating: number; title?: string; body: string; createdAt: string; product?: { name: string }; user?: { name?: string } };
          return (
            <li key={review._id} className="grid gap-4 py-6 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-4">
                  <Stars value={review.rating} />
                  <span className="text-xs text-stone">{review.product?.name ?? 'Product'} · {formatDate(review.createdAt)}</span>
                </div>
                {review.title ? <p className="font-display text-lg">{review.title}</p> : null}
                <p className="text-ivory-dim">{review.body}</p>
                <Badge tone="success">Verified purchase</Badge>
              </div>
              <div className="flex items-start gap-3">
                {status !== 'approved' ? <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review._id, status: 'approved' }, { onSuccess: () => toast.success('Review approved.') })}>Approve</Button> : null}
                {status !== 'rejected' ? <Button size="sm" variant="danger" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review._id, status: 'rejected' }, { onSuccess: () => toast.info('Review rejected.') })}>Reject</Button> : null}
              </div>
            </li>
          );
        })}
      </ul>
      {reviews.data && reviews.data.items.length === 0 ? <p className="text-sm text-stone">No {status} reviews.</p> : null}
    </div>
  );
}

// ---------- Coupons ----------
const BLANK_COUPON = { id: '', code: '', description: '', type: 'percentage' as 'percentage' | 'fixed', value: '10', minSpend: '0', usageLimit: '', expiresAt: '', isActive: true };

export function AdminCoupons() {
  const coupons = useAdminCoupons();
  const save = useSaveCoupon();
  const deactivate = useDeactivateCoupon();
  const [form, setForm] = useState<typeof BLANK_COUPON | null>(null);
  const [error, setError] = useState<string | null>(null);

  const edit = (c: Coupon) =>
    setForm({
      id: c._id,
      code: c.code,
      description: c.description ?? '',
      type: c.type,
      value: String(c.value),
      minSpend: String(c.minSpend),
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      isActive: c.isActive,
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const body = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      type: form.type,
      value: Number(form.value),
      minSpend: Number(form.minSpend) || 0,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isActive: form.isActive,
    };
    save.mutate(
      { id: form.id || undefined, body },
      {
        onSuccess: () => {
          toast.success('Coupon saved.');
          setForm(null);
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save this coupon.'),
      },
    );
  };

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Promotions" title="Coupons" actions={<Button onClick={() => setForm({ ...BLANK_COUPON })}>New coupon</Button>} />
      {form ? (
        <form onSubmit={submit} className="grid gap-6 border border-gold/40 p-6 sm:grid-cols-2" noValidate>
          <Field label="Code" htmlFor="cc"><Input id="cc" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Type" htmlFor="ct">
            <Select id="ct" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount (MWK)</option>
            </Select>
          </Field>
          <Field label={form.type === 'percentage' ? 'Percent off' : 'Amount off (MWK)'} htmlFor="cv"><Input id="cv" type="number" min={0} required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
          <Field label="Minimum spend (MWK)" htmlFor="cm"><Input id="cm" type="number" min={0} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} /></Field>
          <Field label="Usage limit (blank = unlimited)" htmlFor="cu"><Input id="cu" type="number" min={1} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /></Field>
          <Field label="Expires on" htmlFor="ce"><Input id="ce" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></Field>
          <Field label="Description (internal)" htmlFor="cd" className="sm:col-span-2"><Input id="cd" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-[#c9a96e]" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          {error ? <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div> : null}
          <div className="flex gap-4 sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>Save coupon</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      ) : null}
      {coupons.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {coupons.data ? (
        <TableShell>
          <thead><tr><Th>Code</Th><Th>Discount</Th><Th>Min spend</Th><Th>Used</Th><Th>Expires</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {coupons.data.map((c) => (
              <tr key={c._id}>
                <Td className="font-display text-ivory">{c.code}</Td>
                <Td>{c.type === 'percentage' ? `${c.value}%` : formatMWK(c.value)}</Td>
                <Td>{formatMWK(c.minSpend)}</Td>
                <Td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</Td>
                <Td className="text-xs">{c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</Td>
                <Td><Badge tone={c.isActive ? 'success' : 'muted'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                <Td className="space-x-4 whitespace-nowrap text-right text-xs">
                  <button className="text-gold" onClick={() => edit(c)}>Edit</button>
                  {c.isActive ? <button className="text-stone hover:text-danger" onClick={() => deactivate.mutate(c._id, { onSuccess: () => toast.info('Coupon deactivated.') })}>Deactivate</button> : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : null}
    </div>
  );
}

// ---------- Customers ----------
export function AdminCustomers() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const customers = useAdminCustomers(search, page);
  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Clients" title="Customers" />
      <form className="flex gap-4" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
        <Input aria-label="Search customers" className="max-w-sm" placeholder="Name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>
      {customers.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {customers.data ? (
        <TableShell>
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th className="text-right">Points</Th><Th>Joined</Th></tr></thead>
          <tbody>
            {customers.data.items.map((c) => (
              <tr key={c._id}>
                <Td className="text-ivory">{c.name}</Td>
                <Td>{c.email}</Td>
                <Td>{c.phone ?? '—'}</Td>
                <Td className="text-right">{c.points}</Td>
                <Td className="text-xs">{formatDate(c.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : null}
      {customers.data && customers.data.pages > 1 ? (
        <div className="flex items-center gap-4 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-stone">Page {page} of {customers.data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= customers.data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Settings (super admin) ----------
export function AdminSettings() {
  const me = useMe();
  const settings = useStoreSettings();
  const [form, setForm] = useState<Partial<StoreSettings> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (me.data && me.data.role !== 'super_admin') {
    return <Notice tone="error">Only super admins can change store settings.</Notice>;
  }
  const current = { ...settings.data, ...form };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api('/admin/settings', {
        method: 'PATCH',
        body: {
          storeName: current.storeName,
          supportEmail: current.supportEmail,
          supportPhone: current.supportPhone || undefined,
          whatsappNumber: current.whatsappNumber ? current.whatsappNumber.replace(/\D/g, '') : undefined,
          maintenanceMode: current.maintenanceMode,
        },
      });
      toast.success('Settings saved.');
      setForm(null);
      settings.refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Configuration" title="Store settings" />
      {settings.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {settings.data ? (
        <form onSubmit={save} className="grid max-w-3xl gap-6 sm:grid-cols-2" noValidate>
          <Field label="Store name" htmlFor="sn"><Input id="sn" value={current.storeName ?? ''} onChange={(e) => setForm({ ...form, storeName: e.target.value })} /></Field>
          <Field label="Support email" htmlFor="se"><Input id="se" type="email" value={current.supportEmail ?? ''} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></Field>
          <Field label="Support phone" htmlFor="sp"><Input id="sp" type="tel" value={current.supportPhone ?? ''} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} /></Field>
          <Field label="WhatsApp number (digits, international)" htmlFor="sw" hint="e.g. 265999000000"><Input id="sw" inputMode="numeric" value={current.whatsappNumber ?? ''} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-[#c9a96e]" checked={Boolean(current.maintenanceMode)} onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })} /> Maintenance mode (hides the storefront from customers)</label>
          {error ? <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div> : null}
          <div className="sm:col-span-2"><Button type="submit" disabled={saving || !form}>{saving ? 'Saving…' : 'Save settings'}</Button></div>
        </form>
      ) : null}
    </div>
  );
}
