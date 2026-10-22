import type { Metadata } from 'next';
import { ContactForm } from '@/components/layout/contact-form';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach the Two O’Clock team by form or WhatsApp for orders, sizing, and authenticity questions.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-16 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="font-display mt-3 text-5xl">We are here to help.</h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-stone">
          Questions about sizing, authenticity, delivery or an order? Send us a message and a member of the team will reply. For the quickest answers, message us on WhatsApp.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
