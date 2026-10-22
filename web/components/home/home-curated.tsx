'use client';

import { ProductRail } from '@/components/product/product-rail';
import { useCurated } from '@/hooks/use-store';

/** Featured watches, featured sneakers and trending (highest sales) products. */
export function HomeCurated() {
  const watches = useCurated('featured', 'watches', 4);
  const sneakers = useCurated('featured', 'sneakers', 4);
  const trending = useCurated('trending', undefined, 4);
  return (
    <>
      <ProductRail eyebrow="Featured" title="Featured watches" products={watches.data} loading={watches.isLoading} href="/shop?category=watches" />
      <ProductRail eyebrow="Featured" title="Featured sneakers" products={sneakers.data} loading={sneakers.isLoading} href="/shop?category=sneakers" />
      <ProductRail eyebrow="Most loved" title="Trending now" products={trending.data} loading={trending.isLoading} href="/shop?sort=bestselling" />
    </>
  );
}
