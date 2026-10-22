/**
 * Demo API: answers the storefront's read-only API calls from the seed catalogue snapshot.
 * Mirrors the shapes of the real API (server/src/routes). Only used in the static demo build.
 */
import type { Category, Paginated, Product } from '@/lib/types';
import catalog from '@/data/catalog.json';
import { STORE } from '@/lib/store-config';

interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number;
}

interface SeedProduct {
  name: string;
  category: string;
  brand: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice?: number;
  stock: number;
  sku: string;
  image: string;
  sizes?: string[];
  colors?: string[];
  tags: string[];
  featured?: boolean;
  soldCount?: number;
}
import { asset } from './asset';

export class DemoError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'DemoError';
    this.status = status;
    this.code = code;
  }
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const categories: Category[] = (catalog.categories as SeedCategory[]).map((c, i) => ({
  _id: `cat-${c.slug}`,
  name: c.name,
  slug: c.slug,
  description: c.description,
  image: asset(c.image),
  sortOrder: c.sortOrder ?? i + 1,
}));
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

const products: Product[] = (catalog.products as SeedProduct[]).map((p, i) => {
  const category = categoryBySlug.get(p.category);
  const salePrice = p.salePrice ?? null;
  return {
    _id: `prod-${String(i + 1).padStart(3, '0')}`,
    name: p.name,
    slug: slugify(p.name),
    brand: p.brand,
    shortDescription: p.shortDescription,
    description: p.description,
    price: p.price,
    salePrice,
    effectivePrice: salePrice ?? p.price,
    stock: p.stock,
    sku: p.sku,
    images: [asset(p.image)],
    sizes: [...(p.sizes ?? [])],
    colors: [...(p.colors ?? [])],
    specifications: [
      { label: 'Brand', value: p.brand },
      { label: 'SKU', value: p.sku },
    ],
    tags: [...p.tags],
    rating: 0,
    reviewCount: 0,
    soldCount: p.soldCount ?? 0,
    featured: Boolean(p.featured),
    trending: (p.soldCount ?? 0) >= 20,
    category: category ? { _id: category._id, name: category.name, slug: category.slug } : null,
    createdAt: '2026-10-01T00:00:00.000Z',
  };
});

/** Slugs of every demo product, used to pre-render product pages at build time. */
export const DEMO_PRODUCT_SLUGS: string[] = products.map((p) => p.slug);

type Sorter = (a: Product, b: Product) => number;
const SORTS: Record<string, Sorter> = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || (b.soldCount ?? 0) - (a.soldCount ?? 0),
  'price-asc': (a, b) => (a.effectivePrice ?? 0) - (b.effectivePrice ?? 0),
  'price-desc': (a, b) => (b.effectivePrice ?? 0) - (a.effectivePrice ?? 0),
  newest: (a, b) => String(b._id).localeCompare(String(a._id)),
  rating: (a, b) => b.rating - a.rating,
  bestselling: (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0),
};

function filterProducts(sp: URLSearchParams): Product[] {
  const q = (sp.get('q') ?? '').trim().toLowerCase();
  const category = sp.get('category');
  const brand = sp.get('brand');
  const minPrice = sp.get('minPrice');
  const maxPrice = sp.get('maxPrice');
  const minRating = sp.get('minRating');
  const size = sp.get('size');
  const color = sp.get('color');
  let list = products;
  if (q) list = list.filter((p) => [p.name, p.brand, p.description ?? '', ...p.tags].join(' ').toLowerCase().includes(q));
  if (category) list = list.filter((p) => p.category?.slug === category);
  if (brand) list = list.filter((p) => p.brand === brand);
  if (minPrice) list = list.filter((p) => (p.effectivePrice ?? 0) >= Number(minPrice));
  if (maxPrice) list = list.filter((p) => (p.effectivePrice ?? 0) <= Number(maxPrice));
  if (minRating) list = list.filter((p) => p.rating >= Number(minRating));
  if (size) list = list.filter((p) => p.sizes.includes(size));
  if (color) list = list.filter((p) => p.colors.includes(color));
  if (sp.get('inStock') === 'true') list = list.filter((p) => p.stock > 0);
  return [...list].sort(SORTS[sp.get('sort') ?? 'featured'] ?? SORTS.featured);
}

function paginate<T>(list: T[], sp: URLSearchParams): Paginated<T> {
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 20, 1), 60);
  const page = Math.max(Number(sp.get('page')) || 1, 1);
  return {
    items: list.slice((page - 1) * limit, page * limit),
    total: list.length,
    page,
    pages: Math.max(1, Math.ceil(list.length / limit)),
  };
}

function facets() {
  const prices = products.map((p) => p.effectivePrice ?? 0);
  return {
    brands: [...new Set(products.map((p) => p.brand))].sort(),
    sizes: [...new Set(products.flatMap((p) => p.sizes))].sort(),
    colors: [...new Set(products.flatMap((p) => p.colors))].sort(),
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
  };
}

const notFound = (message: string) => new DemoError(404, 'NOT_FOUND', message);
const unauthorized = () => new DemoError(401, 'UNAUTHORIZED', 'Sign in required');
const demoOnly = () =>
  new DemoError(
    503,
    'DEMO_ONLY',
    'Online accounts are not available on this site. Please order on WhatsApp instead.',
  );

/**
 * Answers one API request. `path` is the part after /api (e.g. "/products?limit=8").
 * Resolves with the same JSON the real API would return, or rejects with a DemoError.
 */
export async function demoRequest<T = unknown>(path: string, options: { method?: string } = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'http://demo.local');
  const { pathname } = url;
  const sp = url.searchParams;

  if (method !== 'GET' && method !== 'HEAD') {
    if (pathname === '/analytics/events') return { ok: true } as T;
    throw demoOnly();
  }

  if (pathname === '/health') return { status: 'ok', db: 'demo' } as T;
  if (pathname === '/settings') {
    return {
      storeName: STORE.name,
      supportEmail: '',
      supportPhone: STORE.whatsappDisplay,
      whatsappNumber: STORE.whatsapp,
      maintenanceMode: false,
      currency: 'MWK',
    } as T;
  }
  if (pathname === '/payments/methods') {
    return {
      methods: [
        { id: 'stripe', label: 'Card', enabled: false },
        { id: 'whatsapp', label: 'WhatsApp', enabled: false },
      ],
    } as T;
  }

  if (pathname === '/categories') return { items: categories } as T;
  const categoryMatch = pathname.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const category = categoryBySlug.get(categoryMatch[1]);
    if (!category) throw notFound('Category not found');
    return { item: category } as T;
  }

  if (pathname === '/products') return paginate(filterProducts(sp), sp) as T;
  if (pathname === '/products/facets') return facets() as T;
  if (pathname === '/products/suggest') {
    const q = (sp.get('q') ?? '').trim().toLowerCase();
    const matches = q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)) : [];
    return { products: matches.slice(0, 6), brands: [...new Set(matches.map((p) => p.brand))] } as T;
  }
  if (pathname === '/products/featured' || pathname === '/products/trending') {
    const limit = Math.min(Number(sp.get('limit')) || 8, 24);
    const category = sp.get('category');
    const base = pathname === '/products/featured' ? products.filter((p) => p.featured) : [...products].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
    return { items: base.filter((p) => !category || p.category?.slug === category).slice(0, limit) } as T;
  }
  if (pathname === '/products/by-ids') {
    const ids = (sp.get('ids') ?? '').split(',').map((s) => s.trim());
    return { items: products.filter((p) => ids.includes(String(p._id))) } as T;
  }
  const productMatch = pathname.match(/^\/products\/([^/]+)(\/related)?$/);
  if (productMatch) {
    const [, slug, related] = productMatch;
    const product = products.find((p) => p.slug === decodeURIComponent(slug));
    if (!product) throw notFound('Product not found');
    if (related) {
      return {
        related: products.filter((p) => p._id !== product._id && p.category?._id === product.category?._id).slice(0, 4),
        similar: products.filter((p) => p._id !== product._id && p.brand === product.brand).slice(0, 4),
      } as T;
    }
    return { item: product } as T;
  }

  if (pathname === '/reviews') {
    return { items: [], total: 0, page: 1, pages: 1, summary: { rating: 0, reviewCount: 0 } } as T;
  }
  if (pathname === '/blog') return { items: [], total: 0, page: 1, pages: 1 } as T;
  if (pathname.startsWith('/blog/')) throw notFound('Post not found');

  if (pathname === '/auth/me' || pathname === '/auth/refresh' || pathname === '/wishlist' || pathname.startsWith('/orders')) {
    throw unauthorized();
  }

  throw notFound('Not available in the demo');
}
