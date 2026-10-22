'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="font-display mt-4 text-4xl">We could not load this page.</h1>
      <p className="mt-6 text-sm text-stone">Please try again. If the problem continues, message us on WhatsApp and we will help.</p>
      <Button className="mt-10" onClick={reset}>Try again</Button>
    </div>
  );
}
