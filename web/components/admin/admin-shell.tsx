'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';
import { useMe } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/settings', label: 'Settings', superOnly: true },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth admin>
      <AdminFrame>{children}</AdminFrame>
    </RequireAuth>
  );
}

function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const isSuper = me.data?.role === 'super_admin';
  return (
    <div className="grid min-h-screen lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-ink-line bg-ink-soft/40 px-4 py-6 lg:border-b-0 lg:border-r lg:px-6 lg:py-10">
        <Link href="/admin" className="font-display text-lg">Studio</Link>
        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-stone">{isSuper ? 'Super admin' : 'Staff'}</p>
        <nav aria-label="Admin" className="mt-8 flex gap-5 overflow-x-auto lg:flex-col lg:gap-2">
          {LINKS.filter((l) => !l.superOnly || isSuper).map((l) => {
            const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} className={cn('whitespace-nowrap py-1 text-sm', active ? 'text-gold' : 'text-stone hover:text-ivory')}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/" className="mt-10 hidden text-xs uppercase tracking-[0.2em] text-stone hover:text-gold lg:block">← Storefront</Link>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:py-10">{children}</div>
    </div>
  );
}

export function AdminHeader({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-2 text-3xl sm:text-4xl">{title}</h1>
      </div>
      {actions}
    </header>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'danger' | 'gold' }) {
  return (
    <div className="bg-ink p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone">{label}</p>
      <p className={cn('font-display mt-2 text-3xl', tone === 'danger' && 'text-danger', tone === 'gold' && 'text-gold')}>{value}</p>
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto border border-ink-line"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('border-b border-ink-line px-4 py-3 text-[10px] font-normal uppercase tracking-[0.2em] text-stone', className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('border-b border-ink-line px-4 py-3 align-top text-ivory-dim', className)}>{children}</td>;
}
