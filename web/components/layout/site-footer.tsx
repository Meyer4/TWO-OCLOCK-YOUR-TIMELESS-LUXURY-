import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DEMO } from '@/lib/demo/mode';
import { STORE, waLink } from '@/lib/store-config';

export function SiteFooter() {
  const help: Array<[string, string]> = [
    ['Contact us', '/contact'],
    ...(DEMO ? [] : ([['Track an order', '/account/orders'], ['Refer a friend', '/account']] as Array<[string, string]>)),
  ];
  const follow: Array<[string, string]> = [
    ['WhatsApp', waLink()],
    ...(STORE.tiktok ? [['TikTok', STORE.tiktok] as [string, string]] : []),
    ...(STORE.instagram ? [['Instagram', STORE.instagram] as [string, string]] : []),
    ...(STORE.facebook ? [['Facebook', STORE.facebook] as [string, string]] : []),
  ];
  return (
    <footer className="mt-24 border-t border-ink-line bg-ink-soft/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl">Two O&apos;Clock</p>
          <p className="eyebrow mt-2">Timeless Luxury</p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ivory-dim">
            Watches, sneakers, accessories and designer fashion, delivered across Lilongwe and Malawi. Order on WhatsApp, pay by mobile money, PayPal or cash on delivery.
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
        <div className="space-y-10">
          <FooterCol title="Help" links={help} />
          <FooterCol title="Follow" links={follow} external />
        </div>
      </div>
      <div className={cn('gold-hairline mx-auto max-w-7xl')} />
      <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-stone sm:px-6">
        © {new Date().getFullYear()} Two O&apos;Clock · Timeless Luxury. All rights reserved. Prices in Malawi Kwacha (MWK).
      </p>
    </footer>
  );
}

function FooterCol({ title, links, external = false }: { title: string; links: Array<[string, string]>; external?: boolean }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map(([label, href]) => (
          <li key={href}>
            {external ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-ivory-dim hover:text-gold">
                {label}
              </a>
            ) : (
              <Link href={href} className="text-sm text-ivory-dim hover:text-gold">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
