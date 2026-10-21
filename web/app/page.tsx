import type { Metadata } from 'next';
import { Hero } from '@/components/home/hero';
import { Banners } from '@/components/home/banners';
import { TrustStrip } from '@/components/home/trust-strip';
import { CategoryGrid } from '@/components/home/category-grid';
import { HomeCurated } from '@/components/home/home-curated';

export const metadata: Metadata = {
  title: 'Luxury Watches, Sneakers & Designer Fashion',
  description: 'Shop authenticated luxury watches, sneakers and designer fashion in Malawi. Fast delivery in Lilongwe and secure payments.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="py-16">
        <Banners />
      </div>
      <HomeCurated />
      <CategoryGrid />
      <TrustStrip />
    </>
  );
}
