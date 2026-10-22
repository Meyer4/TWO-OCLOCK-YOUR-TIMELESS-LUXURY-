import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ShopView } from '@/components/product/shop-view';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse luxury watches, sneakers, accessories and designer fashion. Filter by brand, size, colour and price.',
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Skeleton className="h-16 w-1/3" />
        </div>
      }
    >
      <ShopView />
    </Suspense>
  );
}
