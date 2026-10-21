import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({ eyebrow, title, children, footer }: { eyebrow: string; title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <Link href="/" className="font-display mb-10 text-center text-lg tracking-wide text-ivory-dim hover:text-gold">
        Timeless Luxury · Two O&apos;Clock
      </Link>
      <p className="eyebrow text-center">{eyebrow}</p>
      <h1 className="font-display mt-3 text-center text-4xl">{title}</h1>
      <div className="mt-10">{children}</div>
      {footer ? <div className="mt-10 text-center text-sm text-stone">{footer}</div> : null}
    </div>
  );
}
