'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function Hero() {
  const video = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;
  return (
    <section className="relative isolate overflow-hidden">
      {video ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/placeholders/watches.svg"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-50"
        >
          <source src={video} />
        </video>
      ) : (
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_30%_20%,#3a2f1d_0%,#0b0b0c_55%)]"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 6, ease: 'easeOut' }}
        />
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />

      <div className="mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-end gap-8 px-4 pb-20 pt-40 sm:px-6">
        <motion.p custom={0} variants={rise} initial="hidden" animate="show" className="eyebrow">
          Timeless luxury, since two o&apos;clock
        </motion.p>
        <motion.h1 custom={1} variants={rise} initial="hidden" animate="show" className="font-display max-w-4xl text-5xl leading-[1.04] sm:text-7xl">
          Time, <em className="text-gold not-italic">perfectly</em> kept.
        </motion.h1>
        <motion.p custom={2} variants={rise} initial="hidden" animate="show" className="max-w-xl text-base leading-relaxed text-ivory-dim sm:text-lg">
          Authenticated watches, sneakers and designer fashion, delivered across Malawi and beyond. Earn points on every purchase.
        </motion.p>
        <motion.div custom={3} variants={rise} initial="hidden" animate="show" className="flex flex-wrap gap-4">
          <Link href="/shop?category=watches" className={cn(buttonVariants({ variant: 'gold', size: 'lg' }))}>
            Shop Watches
          </Link>
          <Link href="/shop?category=sneakers" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            Shop Sneakers
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
