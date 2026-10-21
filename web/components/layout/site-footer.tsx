import Link from 'next/link';
import { cn } from '@/lib/utils';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-line bg-ink-soft/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl">Two O&apos;Clock</p>
          <p className="eyebrow mt-2">Timeless Luxury &amp; World of Kiki Kicks</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ivory-dim">
            Authenticated watches, sneakers, accessories and designer fashion, delivered across Malawi, Zambia, South Africa and beyond.
          </p>
        </div>
        <FooterCol
          title="Shop"
          links={[
            ['Watches', '/shop?category=watches'],
            ['Sneakers', '/shop?category=sneakers'],
            ['Accessories', '/shop?category=accessories'],
            ['Designer Fashion', '/shop?category=designer-fashion'],
          ]}
        />
        <FooterCol
          title="Help"
          links={[
            ['Contact us', '/contact'],
            ['Track an order', '/account/orders'],
            ['Journal', '/blog'],
            ['Refer a friend', '/account'],
          ]}
        />
      </div>
      <div className={cn('gold-hairline mx-auto max-w-7xl')} />
      <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-stone sm:px-6">
        © {new Date().getFullYear()} Timeless Luxury Two O&apos;Clock. All rights reserved. Prices in Malawi Kwacha (MWK).
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-ivory-dim hover:text-gold">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
