'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMe } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

/** Route guard for signed-in pages. Redirects anonymous visitors to /login with a return path. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (me.isError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me.isError, pathname, router]);

  if (me.isLoading || (!me.data && !me.isError)) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-16 sm:px-6" aria-busy="true">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!me.data) return null;

  if (admin && me.data.role === 'customer') {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="eyebrow">Restricted</p>
        <h1 className="font-display mt-3 text-4xl">This area is for staff.</h1>
        <Link href="/" className="mt-6 inline-block text-xs uppercase tracking-[0.2em] text-gold">
          Return to the store
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
