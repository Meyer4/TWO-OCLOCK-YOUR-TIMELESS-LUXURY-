'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCategories } from '@/hooks/use-store';
import { Skeleton } from '@/components/ui/skeleton';

const FALLBACK_IMAGE: Record<string, string> = {
  watches: '/placeholders/watches.svg',
  sneakers: '/placeholders/sneakers.svg',
  accessories: '/placeholders/accessories.svg',
  'designer-fashion': '/placeholders/fashion.svg',
};

export function CategoryGrid() {
  const { data, isLoading } = useCategories();
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-10">
        <p className="eyebrow">Categories</p>
        <h2 className="font-display mt-2 text-3xl sm:text-4xl">Shop by category</h2>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(data ?? []).map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="group relative aspect-[3/4] overflow-hidden bg-ink-soft">
              <Image
                src={c.image ?? FALLBACK_IMAGE[c.slug] ?? '/placeholders/watches.svg'}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-5">
                <p className="font-display text-xl">{c.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-gold">Explore</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
