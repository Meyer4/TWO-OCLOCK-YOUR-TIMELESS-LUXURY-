'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

const BANNERS = [
  {
    href: '/shop?category=watches',
    eyebrow: 'Horology',
    title: 'The Watch Edit',
    copy: 'Automatic chronometers and dress pieces in steel and gold.',
    image: '/placeholders/watches.svg',
  },
  {
    href: '/shop?category=sneakers',
    eyebrow: 'Footwear',
    title: 'World of Kiki Kicks',
    copy: 'Limited runs and everyday icons, made to be worn.',
    image: '/placeholders/sneakers.svg',
  },
];

export function Banners() {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2">
      {BANNERS.map((b) => (
        <motion.div key={b.href} whileHover={{ y: -4 }} transition={{ duration: 0.4 }}>
          <Link href={b.href} className="group relative block aspect-[4/3] overflow-hidden bg-ink-soft">
            <Image src={b.image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8">
              <p className="eyebrow">{b.eyebrow}</p>
              <h2 className="font-display mt-2 text-3xl">{b.title}</h2>
              <p className="mt-2 max-w-sm text-sm text-ivory-dim">{b.copy}</p>
              <span className="mt-4 inline-block text-[11px] uppercase tracking-[0.25em] text-gold">Explore →</span>
            </div>
          </Link>
        </motion.div>
      ))}
    </section>
  );
}
