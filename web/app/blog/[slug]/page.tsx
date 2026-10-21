import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { renderMarkdown } from '@/lib/markdown';
import { serverGet, SITE_URL } from '@/lib/server-api';
import { formatDate } from '@/lib/format';

interface Post {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  tags: string[];
  publishedAt?: string | null;
  seo?: { title?: string; description?: string; keywords?: string[] };
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = (await serverGet<{ item: Post }>(`/blog/${encodeURIComponent(slug)}`))?.item;
  if (!post) return { title: 'Article not found', robots: { index: false } };
  const title = post.seo?.title ?? post.title;
  const description = post.seo?.description ?? post.excerpt;
  return {
    title,
    description,
    keywords: post.seo?.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title, description, url: `${SITE_URL}/blog/${post.slug}`, images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = (await serverGet<{ item: Post }>(`/blog/${encodeURIComponent(slug)}`))?.item;
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishedAt ?? undefined,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Link href="/blog" className="text-xs uppercase tracking-[0.25em] text-gold">← Journal</Link>
      <p className="mt-8 text-[10px] uppercase tracking-[0.25em] text-stone">{post.category}{post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ''}</p>
      <h1 className="font-display mt-4 text-4xl leading-tight sm:text-5xl">{post.title}</h1>
      <p className="mt-6 text-lg text-ivory-dim">{post.excerpt}</p>
      {post.coverImage ? (
        <div className="relative mt-10 aspect-[16/9] overflow-hidden bg-ink-soft">
          <Image src={post.coverImage} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
        </div>
      ) : null}
      {/* renderMarkdown escapes all HTML before applying formatting, so this is safe to inject. */}
      <div className="prose-tl mt-12" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
    </article>
  );
}
