import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { serverGet } from '@/lib/server-api';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'The Journal',
  description: 'Watch guides, sneaker culture and style notes from the Two O’Clock team.',
  alternates: { canonical: '/blog' },
};

export interface BlogListItem {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  category: string;
  publishedAt?: string | null;
}

export default async function BlogIndex() {
  const data = await serverGet<{ items: BlogListItem[] }>('/blog?limit=24', 300);
  const posts = data?.items ?? [];
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <header className="mb-14 max-w-2xl">
        <p className="eyebrow">Journal</p>
        <h1 className="font-display mt-3 text-5xl">Notes on time, craft and style.</h1>
      </header>
      {posts.length === 0 ? (
        <p className="text-sm text-stone">Our first articles are on their way.</p>
      ) : (
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p._id} href={`/blog/${p.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-soft">
                {p.coverImage ? <Image src={p.coverImage} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" /> : null}
              </div>
              <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-gold">{p.category}</p>
              <h2 className="font-display mt-2 text-2xl leading-snug group-hover:text-gold">{p.title}</h2>
              <p className="mt-3 text-sm text-stone">{p.excerpt}</p>
              {p.publishedAt ? <p className="mt-4 text-xs text-stone">{formatDate(p.publishedAt)}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
