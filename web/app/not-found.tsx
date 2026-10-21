import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-display mt-4 text-5xl">This moment has passed.</h1>
      <p className="mt-6 text-sm text-stone">The page you are looking for does not exist or has moved.</p>
      <div className="mt-10 flex justify-center gap-8 text-xs uppercase tracking-[0.25em]">
        <Link href="/shop" className="text-gold">Shop</Link>
        <Link href="/" className="text-ivory-dim">Home</Link>
      </div>
    </div>
  );
}
