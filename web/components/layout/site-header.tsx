'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useMe } from '@/hooks/use-auth';
import { useProductSuggestions } from '@/hooks/use-store';
import { useCart, cartTotals } from '@/store/cart';
import { useHydrated } from '@/hooks/use-hydrated';
import { formatMWK } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/shop?category=watches', label: 'Watches' },
  { href: '/shop?category=sneakers', label: 'Sneakers' },
  { href: '/shop?category=accessories', label: 'Accessories' },
  { href: '/shop?category=designer-fashion', label: 'Designer Fashion' },
  { href: '/blog', label: 'Journal' },
  { href: '/contact', label: 'Contact' },
];

function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const suggestions = useProductSuggestions(debounced);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/shop?q=${encodeURIComponent(term.trim())}`);
  };

  const products = suggestions.data?.products ?? [];
  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search" className="flex items-center border-b border-ink-line focus-within:border-gold">
        <Search className="h-4 w-4 text-stone" aria-hidden />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search watches, sneakers, brands"
          aria-label="Search products"
          className="w-full bg-transparent px-3 py-2 text-sm text-ivory placeholder:text-stone focus:outline-none"
        />
      </form>
      {open && debounced.trim().length >= 2 && (products.length > 0 || suggestions.data?.brands.length) ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 border border-ink-line bg-ink-soft shadow-2xl">
          <ul className="max-h-96 overflow-auto py-2">
            {products.map((p) => (
              <li key={p._id}>
                <Link
                  href={`/products/${p.slug}`}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-ink"
                >
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="h-10 w-10 object-cover" />
                  ) : null}
                  <span className="flex-1">
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-stone">{p.brand}</span>
                    <span className="text-sm text-ivory">{p.name}</span>
                  </span>
                  <span className="text-xs text-gold">{formatMWK(p.salePrice ?? p.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {suggestions.data?.brands.length ? (
            <div className="border-t border-ink-line px-4 py-3 text-xs text-stone">
              Brands:{' '}
              {suggestions.data.brands.map((b) => (
                <Link key={b} href={`/shop?brand=${encodeURIComponent(b)}`} className="mr-3 text-ivory-dim hover:text-gold" onClick={() => setOpen(false)}>
                  {b}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const me = useMe();
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const { count } = cartTotals(items);
  const cartCount = hydrated ? count : 0;

  // Close the mobile menu whenever the route changes (state adjusted during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-line/70 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <button className="lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="font-display text-lg tracking-wide text-ivory">
          Two O&apos;Clock
          <span className="ml-2 hidden text-[10px] uppercase tracking-[0.3em] text-gold sm:inline">Timeless Luxury</span>
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn('text-[11px] uppercase tracking-[0.22em] text-ivory-dim transition-colors hover:text-gold', pathname === '/shop' && n.href.includes(pathname) && 'text-gold')}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden w-64 xl:block">
          <SearchBox />
        </div>

        <div className="flex items-center gap-4">
          <Link href="/account/wishlist" aria-label="Wishlist" className="text-ivory-dim hover:text-gold">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href={hydrated && me.data ? '/account' : '/login'} aria-label="Account" className="text-ivory-dim hover:text-gold">
            <User className="h-5 w-5" />
          </Link>
          <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative text-ivory-dim hover:text-gold">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <div className="border-t border-ink-line/60 px-4 py-2 xl:hidden">
        <SearchBox />
      </div>

      {menuOpen ? (
        <nav aria-label="Mobile" className="border-t border-ink-line bg-ink lg:hidden">
          <ul className="flex flex-col py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block px-6 py-3 text-sm uppercase tracking-[0.2em] text-ivory-dim hover:text-gold">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={me.data ? '/account' : '/login'} className="block px-6 py-3 text-sm uppercase tracking-[0.2em] text-ivory-dim hover:text-gold">
                {me.data ? 'My account' : 'Sign in'}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
