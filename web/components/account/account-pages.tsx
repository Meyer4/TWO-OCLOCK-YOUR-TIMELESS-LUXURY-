'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddresses, useChangePassword, useDeleteAddress, useMe, useReferral, useSaveAddress, useUpdateProfile } from '@/hooks/use-auth';
import { useMyOrders, useWishlist, useWishlistMutations, useCancelOrder } from '@/hooks/use-store';
import { ApiError } from '@/lib/api';
import { effectivePrice, formatDate, formatMWK, ORDER_STATUS_LABELS } from '@/lib/format';
import { useCart } from '@/store/cart';
import { toast } from '@/store/toast';
import { ProductCard } from '@/components/product/product-card';
import type { Address, Product } from '@/lib/types';

export function AccountOverview() {
  const me = useMe();
  const referral = useReferral(Boolean(me.data));
  const orders = useMyOrders(1);
  const [copied, setCopied] = useState(false);
  const code = referral.data?.code ?? me.data?.referralCode ?? '';

  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">Overview</p>
        <h1 className="font-display mt-2 text-4xl">Welcome back{me.data ? `, ${me.data.name.split(' ')[0]}` : ''}.</h1>
      </header>

      <div className="grid gap-px bg-ink-line sm:grid-cols-3">
        <Stat label="Loyalty points" value={String(me.data?.points ?? 0)} hint={`Worth ${formatMWK((me.data?.points ?? 0) * 10)}`} />
        <Stat label="Friends referred" value={String(referral.data?.invited ?? 0)} hint={`${referral.data?.rewarded ?? 0} rewarded`} />
        <Stat label="Orders" value={String(orders.data?.total ?? 0)} hint="All time" />
      </div>

      <section className="border border-ink-line p-6">
        <p className="font-display text-2xl">Refer a friend</p>
        <p className="mt-2 text-sm text-stone">Share your link. Your friend gets bonus points on their first order, and you earn more when they buy.</p>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Your referral code" htmlFor="ref-code"><Input id="ref-code" readOnly value={code} /></Field>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard?.writeText(`${window.location.origin}/register?ref=${code}`).catch(() => undefined);
              setCopied(true);
              toast.success('Referral link copied.');
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <p className="font-display text-2xl">Recent orders</p>
          <Link href="/account/orders" className="text-xs uppercase tracking-[0.2em] text-gold">View all</Link>
        </div>
        {orders.isLoading ? <Skeleton className="h-24 w-full" /> : <OrderList orders={orders.data?.items ?? []} />}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-ink p-6">
      <p className="eyebrow">{label}</p>
      <p className="font-display mt-3 text-4xl">{value}</p>
      <p className="mt-1 text-xs text-stone">{hint}</p>
    </div>
  );
}

type OrderLike = { _id: string; orderNumber: string; status: string; total: number; createdAt: string; items: Array<{ name: string }> };

export function OrderList({ orders }: { orders: OrderLike[] }) {
  if (orders.length === 0) {
    return (
      <div className="border border-ink-line p-10 text-center text-sm text-stone">
        No orders yet. <Link href="/shop" className="text-gold">Explore the collection</Link>.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-ink-line border-y border-ink-line">
      {orders.map((o) => (
        <li key={o._id}>
          <Link href={`/account/orders/${o._id}`} className="flex flex-wrap items-center justify-between gap-4 py-5 hover:text-gold">
            <div>
              <p className="font-display text-lg">{o.orderNumber}</p>
              <p className="text-xs text-stone">{formatDate(o.createdAt)} · {o.items.map((i) => i.name).join(', ')}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge tone="muted">{ORDER_STATUS_LABELS[o.status] ?? o.status}</Badge>
              <span className="text-sm">{formatMWK(o.total)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const orders = useMyOrders(page);
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Purchases</p>
        <h1 className="font-display mt-2 text-4xl">Your orders</h1>
      </header>
      {orders.isLoading ? <Skeleton className="h-40 w-full" /> : <OrderList orders={orders.data?.items ?? []} />}
      {orders.data && orders.data.pages > 1 ? (
        <div className="flex items-center justify-center gap-6 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-stone">Page {page} of {orders.data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= orders.data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}

export function WishlistPage() {
  const me = useMe();
  const router = useRouter();
  const wishlist = useWishlist(Boolean(me.data));
  const actions = useWishlistMutations();

  /** The bag lives on the device, so items move client-side. Pieces needing a size or colour are chosen on the product page. */
  const moveToBag = (p: Product) => {
    if (p.sizes.length || p.colors.length) {
      router.push(`/products/${p.slug}`);
      return;
    }
    const added = useCart.getState().add({ productId: p._id, slug: p.slug, name: p.name, brand: p.brand, image: p.images[0], unitPrice: effectivePrice(p), listPrice: p.price, stock: p.stock }, 1);
    if (added === 0) {
      toast.error('This piece is sold out.');
      return;
    }
    actions.remove.mutate(p._id);
    toast.success('Added to your bag.');
  };
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Saved pieces</p>
        <h1 className="font-display mt-2 text-4xl">Wishlist</h1>
      </header>
      {wishlist.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {wishlist.data && wishlist.data.length === 0 ? (
        <div className="border border-ink-line p-10 text-center text-sm text-stone">Nothing saved yet. Tap the heart on any piece to keep it here.</div>
      ) : null}
      {wishlist.data && wishlist.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3">
          {wishlist.data.map((p) => (
            <div key={p._id} className="space-y-3">
              <ProductCard product={p} />
              <div className="flex gap-4 text-xs uppercase tracking-[0.15em]">
                <button className="text-gold disabled:opacity-40" disabled={p.stock <= 0} onClick={() => moveToBag(p)}>
                  {p.sizes.length || p.colors.length ? 'Choose & add' : 'Add to bag'}
                </button>
                <button className="text-stone hover:text-danger" onClick={() => actions.remove.mutate(p._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const EMPTY_ADDRESS = { label: '', recipientName: '', country: 'Malawi', city: '', district: '', street: '', phone: '' };

export function AddressesPage() {
  const me = useMe();
  const addresses = useAddresses(Boolean(me.data));
  const save = useSaveAddress();
  const remove = useDeleteAddress();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [error, setError] = useState<string | null>(null);

  const open = (a: Address | 'new') => {
    setEditing(a);
    setError(null);
    setForm(a === 'new' ? EMPTY_ADDRESS : { label: a.label ?? '', recipientName: a.recipientName, country: a.country, city: a.city, district: a.district, street: a.street, phone: a.phone });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = { ...form, label: form.label || undefined };
    save.mutate(editing && editing !== 'new' ? { id: editing._id, body } : { body }, {
      onSuccess: () => {
        setEditing(null);
        toast.success('Address saved.');
      },
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save this address.'),
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Delivery</p>
          <h1 className="font-display mt-2 text-4xl">Addresses</h1>
        </div>
        <Button variant="outline" onClick={() => open('new')}>Add address</Button>
      </header>

      {editing ? (
        <form onSubmit={submit} className="grid gap-6 border border-ink-line p-6 sm:grid-cols-2" noValidate>
          <Field label="Label (e.g. Home)" htmlFor="label"><Input id="label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></Field>
          <Field label="Recipient name" htmlFor="rn"><Input id="rn" required value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="ph"><Input id="ph" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Country" htmlFor="co"><Input id="co" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="City" htmlFor="ci"><Input id="ci" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="District" htmlFor="di"><Input id="di" required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
          <Field label="Street and landmark" htmlFor="st" className="sm:col-span-2"><Input id="st" required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field>
          {error ? <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div> : null}
          <div className="flex gap-4 sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save address'}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <ul className="grid gap-6 md:grid-cols-2">
        {(addresses.data ?? []).map((a) => (
          <li key={a._id} className="space-y-3 border border-ink-line p-6 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg">{a.label ?? a.recipientName}</p>
              {a.isDefault ? <Badge>Default</Badge> : null}
            </div>
            <p className="text-ivory-dim">{a.recipientName} · {a.phone}</p>
            <p className="text-stone">{a.street}, {a.district}, {a.city}, {a.country}</p>
            <div className="flex gap-4 pt-2 text-xs uppercase tracking-[0.15em]">
              <button className="text-gold" onClick={() => open(a)}>Edit</button>
              <button className="text-stone hover:text-danger" onClick={() => remove.mutate(a._id, { onSuccess: () => toast.info('Address removed.') })}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      {addresses.data && addresses.data.length === 0 && !editing ? <p className="text-sm text-stone">No saved addresses yet.</p> : null}
    </div>
  );
}

export function ProfilePage() {
  const me = useMe();
  const update = useUpdateProfile();
  const changePassword = useChangePassword();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [loaded, setLoaded] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  if (me.data && !loaded) {
    setProfile({ name: me.data.name, phone: me.data.phone ?? '' });
    setLoaded(true);
  }

  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">Your details</p>
        <h1 className="font-display mt-2 text-4xl">Profile & security</h1>
        {me.data && !me.data.emailVerified ? (
          <div className="mt-4"><Notice>Your email is not verified yet. Check your inbox for the verification link.</Notice></div>
        ) : null}
      </header>

      <form
        className="grid max-w-2xl gap-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate(
            { name: profile.name.trim(), ...(profile.phone.trim() ? { phone: profile.phone.trim() } : {}) },
            { onSuccess: () => toast.success('Profile updated.'), onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update your profile.') },
          );
        }}
      >
        <Field label="Full name" htmlFor="pname"><Input id="pname" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="pphone"><Input id="pphone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Button type="submit" disabled={update.isPending}>Save profile</Button></div>
      </form>

      <form
        className="grid max-w-2xl gap-6 border-t border-ink-line pt-12 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setPwError(null);
          setPwDone(false);
          if (pw.newPassword !== pw.confirmNewPassword) {
            setPwError('New passwords do not match.');
            return;
          }
          changePassword.mutate(pw, {
            onSuccess: () => {
              setPw({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
              setPwDone(true);
            },
            onError: (err) => setPwError(err instanceof ApiError ? err.message : 'Could not change your password.'),
          });
        }}
      >
        <p className="font-display text-2xl sm:col-span-2">Change password</p>
        <Field label="Current password" htmlFor="cp" className="sm:col-span-2"><Input id="cp" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
        <Field label="New password" htmlFor="np"><Input id="np" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        <Field label="Confirm new password" htmlFor="cnp"><Input id="cnp" type="password" autoComplete="new-password" value={pw.confirmNewPassword} onChange={(e) => setPw({ ...pw, confirmNewPassword: e.target.value })} /></Field>
        {pwError ? <div className="sm:col-span-2"><Notice tone="error">{pwError}</Notice></div> : null}
        {pwDone ? <div className="sm:col-span-2"><Notice tone="success">Password updated.</Notice></div> : null}
        <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={changePassword.isPending}>Update password</Button></div>
      </form>
    </div>
  );
}

/** Shared by the order detail page: lets the customer cancel while the order is still unpaid. */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const cancel = useCancelOrder();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button className="text-xs uppercase tracking-[0.2em] text-stone hover:text-danger" onClick={() => setConfirming(true)}>
        Cancel order
      </button>
    );
  }
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-stone">Cancel this order?</span>
      <Button variant="danger" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(orderId, { onSuccess: () => toast.info('Your order was cancelled.'), onError: (e) => toast.error(e instanceof ApiError ? e.message : 'This order can no longer be cancelled.') })}>
        Yes, cancel
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep order</Button>
    </div>
  );
}

