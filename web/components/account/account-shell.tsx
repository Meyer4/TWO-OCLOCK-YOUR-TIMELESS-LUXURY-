'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/auth/require-auth';
import { useLogout, useMe } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/profile', label: 'Profile & security' },
];

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AccountFrame>{children}</AccountFrame>
    </RequireAuth>
  );
}

function AccountFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();
  const isStaff = me.data?.role === 'admin' || me.data?.role === 'super_admin';
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[220px_1fr]">
      <aside>
        <p className="eyebrow">Hello</p>
        <p className="font-display mt-2 text-2xl">{me.data?.name}</p>
        <nav aria-label="Account" className="mt-8 flex gap-6 overflow-x-auto border-b border-ink-line pb-3 lg:flex-col lg:gap-3 lg:border-0 lg:pb-0">
          {LINKS.map((l) => {
            const active = l.href === '/account' ? pathname === '/account' : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} className={cn('whitespace-nowrap text-sm', active ? 'text-gold' : 'text-stone hover:text-ivory')}>
                {l.label}
              </Link>
            );
          })}
          {isStaff ? (
            <Link href="/admin" className="whitespace-nowrap text-sm text-stone hover:text-gold">Admin</Link>
          ) : null}
        </nav>
        <button
          className="mt-8 text-xs uppercase tracking-[0.2em] text-stone hover:text-danger"
          onClick={() =>
            logout.mutate(undefined, {
              onSettled: () => {
                router.replace('/');
                router.refresh();
              },
            })
          }
        >
          Sign out
        </button>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
