'use client';

import { useEffect, useMemo } from 'react';
import { useCart } from '@/store/cart';
import { useProductsByIds } from '@/hooks/use-store';
import { effectivePrice } from '@/lib/format';

/** Keeps persisted cart prices and stock in line with the server. */
export function useCartSync() {
  const items = useCart((s) => s.items);
  const syncProducts = useCart((s) => s.syncProducts);
  const ids = useMemo(() => [...new Set(items.map((i) => i.productId))], [items]);
  const products = useProductsByIds(ids);

  useEffect(() => {
    if (!products.data) return;
    const updates: Record<string, { unitPrice: number; listPrice: number; stock: number; name: string }> = {};
    for (const p of products.data) {
      updates[p._id] = { unitPrice: effectivePrice(p), listPrice: p.price, stock: p.stock, name: p.name };
    }
    syncProducts(updates);
  }, [products.data, syncProducts]);

  return { loading: products.isLoading && ids.length > 0 };
}
