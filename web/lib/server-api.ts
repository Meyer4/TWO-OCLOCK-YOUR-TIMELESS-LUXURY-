/** Server-side API access for Server Components (metadata, sitemap, SEO pages). */
export const API_INTERNAL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function serverGet<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${API_INTERNAL}/api${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
