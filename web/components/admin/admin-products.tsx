'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice, Select, Textarea } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useArchiveProduct, useAdminProducts, useSaveProduct, useUploadSignature, uploadToCloudinary } from '@/hooks/use-admin';
import { useCategories } from '@/hooks/use-store';
import { ApiError } from '@/lib/api';
import { formatMWK } from '@/lib/format';
import { toast } from '@/store/toast';
import type { Product } from '@/lib/types';
import { AdminHeader, Td, Th, TableShell } from './admin-shell';

interface Draft {
  id?: string;
  name: string;
  brand: string;
  category: string;
  price: string;
  salePrice: string;
  stock: string;
  sku: string;
  shortDescription: string;
  description: string;
  images: string;
  video: string;
  sizes: string;
  colors: string;
  tags: string;
  featured: boolean;
  trending: boolean;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
}

const BLANK: Draft = { name: '', brand: '', category: '', price: '', salePrice: '', stock: '0', sku: '', shortDescription: '', description: '', images: '', video: '', sizes: '', colors: '', tags: '', featured: false, trending: false, isActive: true, seoTitle: '', seoDescription: '' };

const list = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

function toDraft(p: Product): Draft {
  return {
    id: p._id,
    name: p.name,
    brand: p.brand,
    category: p.category?._id ?? '',
    price: String(p.price),
    salePrice: p.salePrice ? String(p.salePrice) : '',
    stock: String(p.stock),
    sku: p.sku,
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    images: p.images.join(', '),
    video: p.video ?? '',
    sizes: p.sizes.join(', '),
    colors: p.colors.join(', '),
    tags: p.tags.join(', '),
    featured: Boolean(p.featured),
    trending: Boolean(p.trending),
    isActive: true,
    seoTitle: '',
    seoDescription: '',
  };
}

export function AdminProducts() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const products = useAdminProducts(search, page);
  const archive = useArchiveProduct();
  const [draft, setDraft] = useState<Draft | null>(null);

  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Catalogue" title="Products" actions={<Button onClick={() => setDraft({ ...BLANK })}>New product</Button>} />
      <form className="flex gap-4" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
        <Input aria-label="Search products" className="max-w-sm" placeholder="Search by name, brand or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      {draft ? <ProductForm draft={draft} onClose={() => setDraft(null)} /> : null}

      {products.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {products.data ? (
        <TableShell>
          <thead><tr><Th>Product</Th><Th>SKU</Th><Th className="text-right">Price</Th><Th className="text-right">Stock</Th><Th>Flags</Th><Th /></tr></thead>
          <tbody>
            {products.data.items.map((p) => (
              <tr key={p._id}>
                <Td><span className="font-display text-ivory">{p.name}</span><span className="block text-xs text-stone">{p.brand}</span></Td>
                <Td className="text-xs">{p.sku}</Td>
                <Td className="text-right">{formatMWK(p.salePrice && p.salePrice < p.price ? p.salePrice : p.price)}</Td>
                <Td className="text-right">{p.stock}</Td>
                <Td className="space-x-2">{p.featured ? <Badge>Featured</Badge> : null}{p.trending ? <Badge tone="muted">Trending</Badge> : null}</Td>
                <Td className="space-x-4 whitespace-nowrap text-right text-xs">
                  <button className="text-gold" onClick={() => setDraft(toDraft(p))}>Edit</button>
                  <button
                    className="text-stone hover:text-danger"
                    onClick={() => {
                      if (window.confirm(`Archive ${p.name}? It will be hidden from the store.`)) {
                        archive.mutate(p._id, { onSuccess: () => toast.info('Product archived.'), onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not archive.') });
                      }
                    }}
                  >
                    Archive
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : null}
      {products.data && products.data.pages > 1 ? (
        <div className="flex items-center gap-4 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-stone">Page {page} of {products.data.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= products.data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}

function ProductForm({ draft: initial, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const categories = useCategories();
  const save = useSaveProduct();
  const sign = useUploadSignature();
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadToCloudinary(file, 'products', (f) => sign.mutateAsync(f)));
      }
      setD((prev) => ({ ...prev, images: [...list(prev.images), ...urls].join(', ') }));
      toast.success(`${urls.length} image${urls.length === 1 ? '' : 's'} uploaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const body: Record<string, unknown> = {
      name: d.name.trim(),
      brand: d.brand.trim(),
      category: d.category,
      price: Number(d.price),
      salePrice: d.salePrice ? Number(d.salePrice) : null,
      stock: Number(d.stock),
      sku: d.sku.trim(),
      shortDescription: d.shortDescription.trim() || undefined,
      description: d.description.trim(),
      images: list(d.images),
      video: d.video.trim() || null,
      sizes: list(d.sizes),
      colors: list(d.colors),
      tags: list(d.tags),
      featured: d.featured,
      trending: d.trending,
      isActive: d.isActive,
      seo: d.seoTitle || d.seoDescription ? { title: d.seoTitle || undefined, description: d.seoDescription || undefined } : undefined,
    };
    save.mutate(
      { id: d.id, body },
      {
        onSuccess: () => {
          toast.success(d.id ? 'Product updated.' : 'Product created.');
          onClose();
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            setFieldErrors(err.fieldErrors);
            setError(err.message);
          } else setError('Could not save this product.');
        },
      },
    );
  };

  const text = (key: keyof Draft, label: string, extra?: { required?: boolean; hint?: string; className?: string }) => (
    <Field label={label} htmlFor={`p-${key}`} error={fieldErrors[key]} hint={extra?.hint} className={extra?.className}>
      <Input id={`p-${key}`} required={extra?.required} value={d[key] as string} onChange={(e) => set(key, e.target.value as never)} />
    </Field>
  );

  return (
    <form onSubmit={submit} className="grid gap-6 border border-gold/40 p-6 sm:grid-cols-2" noValidate>
      <p className="font-display text-2xl sm:col-span-2">{d.id ? 'Edit product' : 'New product'}</p>
      {text('name', 'Name', { required: true })}
      {text('brand', 'Brand', { required: true })}
      <Field label="Category" htmlFor="p-category" error={fieldErrors.category}>
        <Select id="p-category" value={d.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">Choose a category</option>
          {(categories.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
      </Field>
      {text('sku', 'SKU', { required: true })}
      {text('price', 'Price (MWK)', { required: true })}
      {text('salePrice', 'Sale price (MWK, optional)')}
      {text('stock', 'Stock', { required: true })}
      {text('sizes', 'Sizes (comma separated)', { hint: 'e.g. 40, 41, 42' })}
      {text('colors', 'Colours (comma separated)')}
      {text('tags', 'Tags (comma separated)', { className: 'sm:col-span-2' })}
      <Field label="Short description" htmlFor="p-shortDescription" className="sm:col-span-2">
        <Input id="p-shortDescription" value={d.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
      </Field>
      <Field label="Description" htmlFor="p-description" error={fieldErrors.description} className="sm:col-span-2">
        <Textarea id="p-description" rows={6} value={d.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Field label="Image URLs (comma separated)" htmlFor="p-images" className="sm:col-span-2" hint="Upload to Cloudinary below, or paste https URLs. First image is the cover.">
        <Input id="p-images" value={d.images} onChange={(e) => set('images', e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <label className="inline-flex cursor-pointer items-center gap-3 text-xs uppercase tracking-[0.2em] text-gold">
          <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files)} />
          {uploading ? 'Uploading…' : 'Upload images'}
        </label>
      </div>
      {text('video', 'Video URL (optional)', { className: 'sm:col-span-2' })}
      <fieldset className="flex flex-wrap gap-6 text-sm sm:col-span-2">
        <legend className="sr-only">Visibility</legend>
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#c9a96e]" checked={d.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#c9a96e]" checked={d.trending} onChange={(e) => set('trending', e.target.checked)} /> Trending</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#c9a96e]" checked={d.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active</label>
      </fieldset>
      {text('seoTitle', 'SEO title (max 70)')}
      {text('seoDescription', 'SEO description (max 160)')}
      {error ? <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div> : null}
      <div className="flex gap-4 sm:col-span-2">
        <Button type="submit" disabled={save.isPending || uploading}>{save.isPending ? 'Saving…' : 'Save product'}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

