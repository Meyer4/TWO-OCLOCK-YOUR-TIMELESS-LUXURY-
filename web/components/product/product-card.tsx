import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { effectivePrice, formatMWK } from '@/lib/format';
import { Stars } from '@/components/ui/stars';
import { Badge } from '@/components/ui/badge';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0] ?? '/placeholders/watches.svg';
  const onSale = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <article>
        <div className="relative aspect-square overflow-hidden bg-ink-soft">
          <Image
            src={image}
            alt={product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {onSale ? <Badge>Sale</Badge> : null}
            {lowStock ? <Badge tone="danger">Only {product.stock} left</Badge> : null}
            {outOfStock ? <Badge tone="muted">Sold out</Badge> : null}
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone">{product.brand}</p>
          <h3 className="font-display text-lg leading-snug text-ivory group-hover:text-gold">{product.name}</h3>
          <p className="text-sm">
            {onSale ? (
              <>
                <span className="mr-2 text-stone line-through">{formatMWK(product.price)}</span>
                <span className="text-gold">{formatMWK(effectivePrice(product))}</span>
              </>
            ) : (
              <span className="text-ivory-dim">{formatMWK(product.price)}</span>
            )}
          </p>
          {product.reviewCount > 0 ? <Stars value={product.rating} label={`(${product.reviewCount})`} /> : null}
        </div>
      </article>
    </Link>
  );
}
