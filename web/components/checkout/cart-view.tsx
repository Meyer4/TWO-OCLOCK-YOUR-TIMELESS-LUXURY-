'use client';

import { DEMO } from '@/lib/demo/mode';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { useCart, cartTotals, MAX_LINE_QTY, type CartItem } from '@/store/cart';
import { useCartSync } from '@/hooks/use-cart-sync';
import { useMe } from '@/hooks/use-auth';
import { estimateShipping } from '@/lib/pricing';
import { formatMWK } from '@/lib/format';
import { toast } from '@/store/toast';
import { useHydrated } from '@/hooks/use-hydrated';
import { Skeleton } from '@/components/ui/skeleton';

export function CartView() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const saved = useCart((s) => s.savedForLater);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const saveForLater = useCart((s) => s.saveForLater);
  const moveToCart = useCart((s) => s.moveToCart);
  const { count, subtotal } = cartTotals(items);
  const { loading } = useCartSync();
  const me = useMe();
  const hydrated = useHydrated();
  const shippingFrom = items.length ? estimateShipping('standard', subtotal) : 0;

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const checkout = () => {
    if (DEMO || me.data) router.push('/checkout');
    else router.push('/login?next=/checkout');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <p className="eyebrow">Your bag</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">{count === 0 ? 'Your bag is empty' : `${count} ${count === 1 ? 'piece' : 'pieces'}`}</h1>
      </header>

      {items.length === 0 ? (
        <div className="border border-ink-line p-12 text-center">
          <p className="text-sm text-stone">Discover pieces made to be kept for a lifetime.</p>
          <Link href="/shop" className="mt-6 inline-block text-xs uppercase tracking-[0.25em] text-gold hover:text-gold-bright">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-ink-line border-y border-ink-line">
            {items.map((item) => (
              <CartRow
                key={item.key}
                item={item}
                loading={loading}
                onQuantity={(q) => setQuantity(item.key, q)}
                onRemove={() => {
                  remove(item.key);
                  toast.info('Removed from your bag.');
                }}
                onSave={() => saveForLater(item.key)}
              />
            ))}
          </ul>

          <aside className="h-fit space-y-6 border border-ink-line p-6 lg:sticky lg:top-28">
            <p className="font-display text-2xl">Summary</p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{formatMWK(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone">Delivery (estimate)</dt><dd>{shippingFrom === 0 ? 'Free' : formatMWK(shippingFrom)}</dd></div>
            </dl>
            <p className="text-xs text-stone">Coupons, loyalty points and final delivery fees are applied at checkout.</p>
            <div className="flex justify-between border-t border-ink-line pt-4 text-sm">
              <span className="text-stone">Estimated total</span>
              <span className="font-display text-xl text-gold">{formatMWK(subtotal + shippingFrom)}</span>
            </div>
            <Button size="lg" className="w-full" onClick={checkout}>
              Checkout
            </Button>
            <p className="text-center text-xs text-stone">
              Prefer to order by chat?{' '}
              <button className="text-gold underline-offset-4 hover:underline" onClick={() => router.push('/checkout?pay=whatsapp')}>
                Order on WhatsApp
              </button>
            </p>
          </aside>
        </div>
      )}

      {saved.length > 0 ? (
        <section className="mt-16">
          <p className="eyebrow mb-6">Saved for later</p>
          <ul className="divide-y divide-ink-line border-y border-ink-line">
            {saved.map((item) => (
              <li key={item.key} className="flex items-center gap-4 py-5">
                <div className="relative h-16 w-16 shrink-0 bg-ink-soft">
                  {item.image ? <Image src={item.image} alt="" fill sizes="64px" className="object-cover" /> : null}
                </div>
                <div className="flex-1">
                  <p className="font-display">{item.name}</p>
                  <p className="text-xs text-stone">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => moveToCart(item.key)}>Move to bag</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CartRow({
  item,
  loading,
  onQuantity,
  onRemove,
  onSave,
}: {
  item: CartItem;
  loading: boolean;
  onQuantity: (q: number) => void;
  onRemove: () => void;
  onSave: () => void;
}) {
  const max = Math.max(1, Math.min(item.stock, MAX_LINE_QTY));
  const options = Array.from({ length: max }, (_, i) => i + 1);
  const onSale = item.unitPrice < item.listPrice;
  return (
    <li className="flex gap-5 py-6">
      <Link href={`/products/${item.slug}`} className="relative h-28 w-28 shrink-0 overflow-hidden bg-ink-soft sm:h-36 sm:w-36">
        {item.image ? <Image src={item.image} alt={item.name} fill sizes="144px" className="object-cover" /> : null}
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone">{item.brand}</p>
          <Link href={`/products/${item.slug}`} className="font-display text-xl hover:text-gold">{item.name}</Link>
          <p className="mt-1 text-xs text-stone">{[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(' · ')}</p>
          {item.stock < item.quantity ? <p className="mt-1 text-xs text-danger">Only {item.stock} left in stock</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="sr-only" htmlFor={`qty-${item.key}`}>Quantity</label>
            <Select id={`qty-${item.key}`} className="w-20 py-2" value={item.quantity} disabled={loading} onChange={(e) => onQuantity(Number(e.target.value))}>
              {options.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            <button onClick={onSave} className="flex items-center gap-1 text-xs text-stone hover:text-gold"><Bookmark className="h-3.5 w-3.5" /> Save</button>
            <button onClick={onRemove} className="flex items-center gap-1 text-xs text-stone hover:text-danger"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
          </div>
          <div className="text-right">
            <p className="text-gold">{formatMWK(item.unitPrice * item.quantity)}</p>
            {onSale ? <p className="text-xs text-stone line-through">{formatMWK(item.listPrice * item.quantity)}</p> : null}
          </div>
        </div>
      </div>
    </li>
  );
}
