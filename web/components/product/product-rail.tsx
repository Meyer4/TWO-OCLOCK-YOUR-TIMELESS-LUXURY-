import type { Product } from '@/lib/types';
import { ProductCard } from './product-card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductRail({
  title,
  eyebrow,
  products,
  loading,
  href,
}: {
  title: string;
  eyebrow?: string;
  products: Product[] | undefined;
  loading?: boolean;
  href?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="font-display mt-2 text-3xl sm:text-4xl">{title}</h2>
        </div>
        {href ? (
          <a href={href} className="text-[11px] uppercase tracking-[0.25em] text-gold hover:text-gold-bright">
            View all
          </a>
        ) : null}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p._id} product={p} priority={i < 2} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone">New pieces are arriving soon.</p>
      )}
    </section>
  );
}
