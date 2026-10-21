import { BadgeCheck, Gift, Lock, Truck } from 'lucide-react';

const ITEMS = [
  { icon: BadgeCheck, title: 'Authenticity', copy: 'Every piece is verified before it leaves our hands.' },
  { icon: Truck, title: 'Fast delivery', copy: 'Same-day and next-day delivery across Lilongwe.' },
  { icon: Lock, title: 'Secure payment', copy: 'Card, Apple Pay, Google Pay, Airtel Money and Mpamba.' },
  { icon: Gift, title: 'Loyalty rewards', copy: 'Earn points on every MWK 1,000 and refer friends.' },
];

export function TrustStrip() {
  return (
    <section className="border-y border-ink-line bg-ink-soft/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="flex gap-4">
            <Icon className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden />
            <div>
              <p className="font-display text-lg">{title}</p>
              <p className="mt-1 text-sm text-stone">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
