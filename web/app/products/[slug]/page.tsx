import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/product-detail';
import type { Product } from '@/lib/types';
import { effectivePrice } from '@/lib/format';
import { DEMO } from '@/lib/demo/mode';
import { demoRequest, DEMO_PRODUCT_SLUGS } from '@/lib/demo/handler';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

type Props = { params: Promise<{ slug: string }> };

/** Static demo build: every demo product gets a pre-rendered page. Live builds render on demand. */
export function generateStaticParams() {
  return DEMO ? DEMO_PRODUCT_SLUGS.map((slug) => ({ slug })) : [];
}

/** Server-side fetch so product pages are fully SEO-rendered. */
async function fetchProduct(slug: string): Promise<Product | null> {
  if (DEMO) {
    try {
      return (await demoRequest<{ item: Product }>(`/products/${encodeURIComponent(slug)}`)).item;
    } catch {
      return null;
    }
  }
  try {
    const res = await fetch(`${API}/api/products/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return ((await res.json()) as { item: Product }).item;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return { title: 'Piece not found', robots: { index: false } };
  const title = product.seo?.title ?? `${product.brand} ${product.name}`;
  const description = product.seo?.description ?? product.shortDescription ?? product.description?.slice(0, 155);
  const image = product.images[0];
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: 'website', title, description, url: `${SITE}/products/${product.slug}`, images: image ? [{ url: image }] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    image: product.images,
    category: product.category?.name,
    aggregateRating:
      product.reviewCount > 0 ? { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'MWK',
      price: effectivePrice(product),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE}/products/${product.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProductDetail product={product} />
    </>
  );
}
