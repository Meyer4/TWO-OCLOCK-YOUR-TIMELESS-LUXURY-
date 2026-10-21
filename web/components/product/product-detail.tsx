'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, ShieldCheck, Minus, Plus } from 'lucide-react';
import { ProductGallery } from './product-gallery';
import { ProductRail } from './product-rail';
import { ReviewsSection } from './reviews-section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stars } from '@/components/ui/stars';
import { Price } from '@/components/ui/price';
import { useCart, lineKey, MAX_LINE_QTY } from '@/store/cart';
import { useRecentlyViewed } from '@/store/recently-viewed';
import { toast } from '@/store/toast';
import { useMe } from '@/hooks/use-auth';
import { useProductsByIds, useRelated, useWishlistMutations, useWishlist } from '@/hooks/use-store';
import { track } from '@/lib/analytics';
import { effectivePrice, formatMWK } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

type Tab = 'description' | 'specifications' | 'reviews';

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  const me = useMe();
  const recent = useRecentlyViewed();
  const related = useRelated(product.slug);
  const wishlist = useWishlist(Boolean(me.data));
  const wishlistActions = useWishlistMutations();

  const [size, setSize] = useState<string | undefined>(product.sizes.length === 1 ? product.sizes[0] : undefined);
  const [color, setColor] = useState<string | undefined>(product.colors.length === 1 ? product.colors[0] : undefined);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>('description');

  const unit = effectivePrice(product);
  const outOfStock = product.stock <= 0;
  const maxQty = Math.min(product.stock, MAX_LINE_QTY);
  const inWishlist = useMemo(() => wishlist.data?.some((w) => w._id === product._id) ?? false, [wishlist.data, product._id]);
  const recentIds = useMemo(() => recent.ids.filter((id) => id !== product._id).slice(0, 4), [recent.ids, product._id]);
  const recentlyViewed = useProductsByIds(recentIds);

  useEffect(() => {
    recent.push(product._id);
    track('product_view', product._id);
    // Record once per product view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  const payload = () => ({
    productId: product._id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: product.images[0],
    unitPrice: unit,
    listPrice: product.price,
    stock: product.stock,
    size,
    color,
  });

  /** Returns true when the item was added to the cart. */
  const ensureAddable = (): boolean => {
    if (outOfStock) {
      toast.error('This piece is sold out.');
      return false;
    }
    if (product.sizes.length > 0 && !size) {
      toast.error('Please select a size.');
      return false;
    }
    if (product.colors.length > 0 && !color) {
      toast.error('Please select a colour.');
      return false;
    }
    const existing = useCart.getState().items.find((i) => i.key === lineKey(product._id, size, color))?.quantity ?? 0;
    if (existing + quantity > maxQty) {
      toast.error(`You can add up to ${maxQty} of this piece.`);
      return false;
    }
    return addToCart(payload(), quantity) > 0;
  };

  const handleAdd = () => {
    if (ensureAddable()) {
      track('add_to_cart', product._id);
      toast.success(`${product.name} added to your bag.`);
    }
  };

  const handleBuyNow = () => {
    if (ensureAddable()) router.push('/checkout');
  };

  const handleWhatsApp = () => {
    if (ensureAddable()) router.push('/checkout?pay=whatsapp');
  };

  const handleWishlist = () => {
    if (!me.data) {
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }
    if (inWishlist) {
      wishlistActions.remove.mutate(product._id, { onSuccess: () => toast.info('Removed from your wishlist.') });
    } else {
      wishlistActions.add.mutate(product._id, { onSuccess: () => toast.success('Saved to your wishlist.') });
    }
  };

  const specs = product.specifications ?? [];
  const pointsPreview = Math.floor(unit / 1000) * quantity;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.2em] text-stone">
        <Link href="/shop" className="hover:text-gold">Shop</Link>
        {product.category ? (
          <>
            {' / '}
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-gold">{product.category.name}</Link>
          </>
        ) : null}
        {' / '}
        <span className="text-ivory-dim">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <ProductGallery images={product.images} video={product.video} name={product.name} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{product.brand}</p>
          <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          {product.reviewCount > 0 ? (
            <div className="mt-3">
              <Stars value={product.rating} label={`${product.rating.toFixed(1)} · ${product.reviewCount} reviews`} />
            </div>
          ) : null}
          <div className="mt-6">
            <Price price={product.price} salePrice={product.salePrice} className="text-3xl" />
            <p className="mt-2 text-xs text-stone">Earn {pointsPreview} loyalty {pointsPreview === 1 ? 'point' : 'points'} with this order</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {outOfStock ? <Badge tone="muted">Sold out</Badge> : product.stock <= 5 ? <Badge tone="danger">Only {product.stock} left</Badge> : <Badge tone="success">In stock</Badge>}
            {product.salePrice && product.salePrice < product.price ? <Badge>Limited offer</Badge> : null}
          </div>

          {product.shortDescription ? <p className="mt-6 text-sm leading-relaxed text-ivory-dim">{product.shortDescription}</p> : null}

          {product.colors.length > 0 ? (
            <fieldset className="mt-8">
              <legend className="mb-3 text-[11px] uppercase tracking-[0.2em] text-stone">Colour{color ? `: ${color}` : ''}</legend>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-pressed={color === c}
                    className={cn('border px-4 py-2 text-xs uppercase tracking-[0.15em]', color === c ? 'border-gold text-gold' : 'border-ink-line text-ivory-dim hover:border-gold/60')}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {product.sizes.length > 0 ? (
            <fieldset className="mt-6">
              <legend className="mb-3 text-[11px] uppercase tracking-[0.2em] text-stone">Size{size ? `: ${size}` : ''}</legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className={cn('h-11 min-w-11 border px-3 text-sm', size === s ? 'border-gold text-gold' : 'border-ink-line text-ivory-dim hover:border-gold/60')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="mt-8 flex items-center gap-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone">Quantity</p>
            <div className="flex items-center border border-ink-line">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="flex h-10 w-10 items-center justify-center hover:text-gold" disabled={quantity <= 1}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-sm" aria-live="polite">{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(maxQty || 1, q + 1))} aria-label="Increase quantity" className="flex h-10 w-10 items-center justify-center hover:text-gold" disabled={quantity >= maxQty}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button size="lg" onClick={handleAdd} disabled={outOfStock} className="w-full">
              Add to cart
            </Button>
            <Button size="lg" variant="outline" onClick={handleBuyNow} disabled={outOfStock} className="w-full">
              Buy now
            </Button>
            <Button size="lg" variant="outline" onClick={handleWhatsApp} disabled={outOfStock} className="w-full">
              <MessageCircle className="h-4 w-4" /> WhatsApp order
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={handleWishlist}
              disabled={wishlistActions.add.isPending}
              className="w-full border border-ink-line"
              aria-pressed={inWishlist}
            >
              <Heart className={cn('h-4 w-4', inWishlist && 'fill-gold text-gold')} />
              {inWishlist ? 'In wishlist' : 'Add to wishlist'}
            </Button>
          </div>

          <div className="mt-10 space-y-3 border-t border-ink-line pt-6 text-sm text-ivory-dim">
            <p className="flex gap-3"><ShieldCheck className="h-4 w-4 shrink-0 text-gold" /> Authenticity checked by our team before dispatch.</p>
            <p>Delivery across Lilongwe (same or next day) and nationwide. Free standard delivery over {formatMWK(150000)}.</p>
            <p>SKU: <span className="text-ivory">{product.sku}</span></p>
          </div>
        </div>
      </div>

      <div className="mt-20">
        <div role="tablist" aria-label="Product information" className="flex gap-8 border-b border-ink-line">
          {(['description', 'specifications', 'reviews'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              onClick={() => setTab(t)}
              className={cn('pb-4 text-xs uppercase tracking-[0.22em]', tab === t ? 'border-b border-gold text-gold' : 'text-stone hover:text-ivory-dim')}
            >
              {t === 'reviews' ? `Reviews (${product.reviewCount})` : t}
            </button>
          ))}
        </div>
        <div id={`panel-${tab}`} role="tabpanel" className="py-10">
          {tab === 'description' ? (
            <div className="max-w-3xl whitespace-pre-line text-sm leading-7 text-ivory-dim">{product.description}</div>
          ) : null}
          {tab === 'specifications' ? (
            <dl className="grid max-w-3xl gap-px bg-ink-line sm:grid-cols-2">
              {[{ label: 'Brand', value: product.brand }, { label: 'SKU', value: product.sku }, ...specs].map((s) => (
                <div key={s.label} className="bg-ink p-4">
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-stone">{s.label}</dt>
                  <dd className="mt-1 text-sm text-ivory">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {tab === 'reviews' ? <ReviewsSection productId={product._id} productSlug={product.slug} productName={product.name} /> : null}
        </div>
      </div>

      <ProductRail title="Related pieces" eyebrow="You may also like" products={related.data?.related} loading={related.isLoading} />
      {related.data && related.data.similar.length > 0 ? (
        <ProductRail title="Similar styles" products={related.data.similar} />
      ) : null}
      {recentlyViewed.data && recentlyViewed.data.length > 0 ? (
        <ProductRail title="Recently viewed" products={recentlyViewed.data} />
      ) : null}
    </div>
  );
}
