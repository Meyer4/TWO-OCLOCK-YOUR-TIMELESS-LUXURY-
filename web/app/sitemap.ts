import type { MetadataRoute } from 'next';
import { serverGet, SITE_URL } from '@/lib/server-api';
import type { Category, Product, Paginated } from '@/lib/types';
import type { BlogListItem } from './blog/page';

export const revalidate = 3600;

/** Public, indexable URLs only. Product and article lists are fetched from the API at build/revalidate time. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const categories = await serverGet<{ items: Category[] }>('/categories');
  for (const c of categories?.items ?? []) {
    entries.push({ url: `${SITE_URL}/shop?category=${c.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
  }

  for (let page = 1; page <= 50; page++) {
    const batch = await serverGet<Paginated<Product>>(`/products?limit=60&page=${page}`);
    for (const p of batch?.items ?? []) {
      entries.push({ url: `${SITE_URL}/products/${p.slug}`, lastModified: p.createdAt ? new Date(p.createdAt) : now, changeFrequency: 'weekly', priority: 0.7 });
    }
    if (!batch || page >= batch.pages) break;
  }

  const posts = await serverGet<{ items: BlogListItem[] }>('/blog?limit=100');
  for (const post of posts?.items ?? []) {
    entries.push({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: post.publishedAt ? new Date(post.publishedAt) : now, changeFrequency: 'monthly', priority: 0.5 });
  }
  return entries;
}
