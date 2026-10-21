'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Notice, Select, Textarea } from '@/components/ui/field';
import { Stars } from '@/components/ui/stars';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useCreateReview, useReviews } from '@/hooks/use-store';
import { useMe } from '@/hooks/use-auth';
import { toast } from '@/store/toast';

export function ReviewsSection({ productId, productSlug, productName }: { productId: string; productSlug: string; productName: string }) {
  const [page, setPage] = useState(1);
  const reviews = useReviews(productId, page);
  const me = useMe();
  const create = useCreateReview();
  const [form, setForm] = useState({ rating: '5', title: '', body: '' });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      { productId, rating: Number(form.rating), title: form.title || undefined, body: form.body },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          setForm({ rating: '5', title: '', body: '' });
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'We could not submit your review.'),
      },
    );
  };

  const summary = reviews.data?.summary;
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
      <div>
        {summary && summary.reviewCount > 0 ? (
          <div className="mb-8 flex items-center gap-4">
            <p className="font-display text-5xl">{summary.rating.toFixed(1)}</p>
            <div>
              <Stars value={summary.rating} />
              <p className="mt-1 text-xs text-stone">{summary.reviewCount} verified reviews</p>
            </div>
          </div>
        ) : (
          <p className="mb-8 text-sm text-stone">No reviews yet. Be the first to share your experience after your purchase.</p>
        )}

        <ul className="divide-y divide-ink-line">
          {reviews.data?.items.map((r) => (
            <li key={r.id} className="py-6">
              <div className="flex items-center justify-between gap-4">
                <Stars value={r.rating} />
                <span className="text-xs text-stone">{formatDate(r.createdAt)}</span>
              </div>
              {r.title ? <p className="mt-3 font-display text-lg">{r.title}</p> : null}
              <p className="mt-2 text-sm leading-relaxed text-ivory-dim">{r.body}</p>
              {r.photos.length > 0 ? (
                <div className="mt-4 flex gap-2">
                  {r.photos.map((src) => (
                    <div key={src} className="relative h-20 w-20 overflow-hidden bg-ink-soft">
                      <Image src={src} alt={`Customer photo of ${productName}`} fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-gold">
                {r.author} · Verified purchase
              </p>
            </li>
          ))}
        </ul>

        {reviews.data && reviews.data.pages > 1 ? (
          <div className="mt-6 flex gap-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= reviews.data.pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        ) : null}
      </div>

      <div className="border border-ink-line p-6">
        <p className="font-display text-2xl">Write a review</p>
        {!me.data ? (
          <p className="mt-4 text-sm text-stone">
            <a href={`/login?next=/products/${productSlug}`} className="text-gold underline-offset-4 hover:underline">Sign in</a> to review pieces you have purchased.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
            <Field label="Rating" htmlFor="rating">
              <Select id="rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} — {['', 'Poor', 'Fair', 'Good', 'Very good', 'Exceptional'][n]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Title (optional)" htmlFor="title">
              <Input id="title" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Your review" htmlFor="body">
              <Textarea id="body" required minLength={10} maxLength={3000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? 'Submitting…' : 'Submit review'}
            </Button>
            <p className="text-xs text-stone">Reviews are published after moderation.</p>
          </form>
        )}
      </div>
    </div>
  );
}
