'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useCategories, useFacets, useProducts, type ProductFilters } from '@/hooks/use-store';
import { ProductCard } from './product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'bestselling', label: 'Best sellers' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

function readFilters(sp: URLSearchParams): ProductFilters {
  const num = (v: string | null) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  return {
    q: sp.get('q') ?? undefined,
    category: sp.get('category') ?? undefined,
    brand: sp.get('brand') ?? undefined,
    minPrice: num(sp.get('minPrice')),
    maxPrice: num(sp.get('maxPrice')),
    minRating: num(sp.get('minRating')),
    inStock: sp.get('inStock') === 'true',
    size: sp.get('size') ?? undefined,
    color: sp.get('color') ?? undefined,
    sort: sp.get('sort') ?? 'featured',
    page: num(sp.get('page')) ?? 1,
  };
}

/** Remounted (via key) whenever the URL changes, so its draft always starts from the applied values. */
function PriceFilter({
  min,
  max,
  placeholderMin,
  placeholderMax,
  onApply,
}: {
  min?: number | undefined;
  max?: number | undefined;
  placeholderMin: number;
  placeholderMax: number | undefined;
  onApply: (min: string | undefined, max: string | undefined) => void;
}) {
  const [draft, setDraft] = useState({ min: min?.toString() ?? '', max: max?.toString() ?? '' });
  return (
    <div className="space-y-4">
      <p className="eyebrow">Price (MWK)</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min" htmlFor="min-price">
          <Input id="min-price" inputMode="numeric" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/\D/g, '') })} placeholder={String(placeholderMin)} />
        </Field>
        <Field label="Max" htmlFor="max-price">
          <Input id="max-price" inputMode="numeric" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value.replace(/\D/g, '') })} placeholder={placeholderMax !== undefined ? String(placeholderMax) : ''} />
        </Field>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={() => onApply(draft.min || undefined, draft.max || undefined)}>
        Apply price
      </Button>
    </div>
  );
}

export function ShopView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters(searchParams);
  const products = useProducts({ ...filters, limit: 24 });
  const categories = useCategories();
  const facets = useFacets({ category: filters.category, brand: filters.brand, q: filters.q });
  const [mobileOpen, setMobileOpen] = useState(false);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '' || value === 'false') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    router.push(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };

  const activeCategory = categories.data?.find((c) => c.slug === filters.category);

  const filterPanel = (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-3">Category</p>
        <ul className="space-y-2">
          <li>
            <button onClick={() => update({ category: undefined })} className={cn('text-sm hover:text-gold', !filters.category && 'text-gold')}>
              All categories
            </button>
          </li>
          {(categories.data ?? []).map((c) => (
            <li key={c._id}>
              <button onClick={() => update({ category: c.slug })} className={cn('text-sm hover:text-gold', filters.category === c.slug ? 'text-gold' : 'text-ivory-dim')}>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <PriceFilter
          key={searchParams.toString()}
          min={filters.minPrice}
          max={filters.maxPrice}
          placeholderMin={facets.data?.priceRange.min ?? 0}
          placeholderMax={facets.data?.priceRange.max}
          onApply={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
        />

      <Field label="Brand" htmlFor="brand">
        <Select id="brand" value={filters.brand ?? ''} onChange={(e) => update({ brand: e.target.value || undefined })}>
          <option value="">All brands</option>
          {(facets.data?.brands ?? []).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </Field>

      {(facets.data?.sizes.length ?? 0) > 0 ? (
        <Field label="Size" htmlFor="size">
          <Select id="size" value={filters.size ?? ''} onChange={(e) => update({ size: e.target.value || undefined })}>
            <option value="">Any size</option>
            {facets.data?.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {(facets.data?.colors.length ?? 0) > 0 ? (
        <Field label="Colour" htmlFor="color">
          <Select id="color" value={filters.color ?? ''} onChange={(e) => update({ color: e.target.value || undefined })}>
            <option value="">Any colour</option>
            {facets.data?.colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label="Rating" htmlFor="rating">
        <Select id="rating" value={filters.minRating?.toString() ?? ''} onChange={(e) => update({ minRating: e.target.value || undefined })}>
          <option value="">Any rating</option>
          <option value="4">4 stars and up</option>
          <option value="3">3 stars and up</option>
        </Select>
      </Field>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory-dim">
        <input type="checkbox" className="h-4 w-4 accent-[#c9a96e]" checked={filters.inStock ?? false} onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })} />
        In stock only
      </label>

      <Button variant="ghost" size="sm" onClick={() => router.push(pathname)} className="px-0">
        Clear all filters
      </Button>
    </div>
  );

  const pricesApplied = filters.minPrice || filters.maxPrice;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <p className="eyebrow">{activeCategory ? 'Category' : 'The collection'}</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">{activeCategory?.name ?? (filters.q ? `Results for “${filters.q}”` : 'All pieces')}</h1>
        {activeCategory?.description ? <p className="mt-3 max-w-2xl text-sm text-stone">{activeCategory.description}</p> : null}
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-ink-line pb-4">
        <p className="text-sm text-stone" aria-live="polite">
          {products.data ? `${products.data.total} ${products.data.total === 1 ? 'piece' : 'pieces'}` : 'Loading…'}
          {products.data?.fuzzy ? <span className="ml-3 text-gold">Showing close matches for your search</span> : null}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="flex items-center gap-2 text-sm text-ivory-dim lg:hidden">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <Select aria-label="Sort products" className="w-56 py-2" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">{filterPanel}</aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-ink p-6 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="mb-8 flex items-center justify-between">
              <p className="font-display text-2xl">Filters</p>
              <button onClick={() => setMobileOpen(false)} aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterPanel}
            <Button className="mt-10 w-full" onClick={() => setMobileOpen(false)}>
              Show results
            </Button>
          </div>
        ) : null}

        <div>
          {products.isLoading ? (
            <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : products.data && products.data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 xl:grid-cols-3">
              {products.data.items.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <div className="border border-ink-line p-12 text-center">
              <p className="font-display text-2xl">Nothing matches just yet.</p>
              <p className="mt-3 text-sm text-stone">Try a different search, or clear your filters{pricesApplied ? ' and price range' : ''}.</p>
              <Button variant="outline" className="mt-6" onClick={() => router.push(pathname)}>
                Clear filters
              </Button>
            </div>
          )}

          {products.data && products.data.pages > 1 ? (
            <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-6 text-sm">
              <Button variant="outline" size="sm" disabled={products.data.page <= 1} onClick={() => update({ page: String(products.data!.page - 1) })}>
                Previous
              </Button>
              <span className="text-stone">
                Page {products.data.page} of {products.data.pages}
              </span>
              <Button variant="outline" size="sm" disabled={products.data.page >= products.data.pages} onClick={() => update({ page: String(products.data!.page + 1) })}>
                Next
              </Button>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
