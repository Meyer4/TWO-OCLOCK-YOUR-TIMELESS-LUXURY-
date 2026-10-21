import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { WhatsAppButton } from '@/components/layout/whatsapp-button';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? "Timeless Luxury Two O'Clock";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${storeName} | Luxury Watches, Sneakers & Designer Fashion`,
    template: `%s | ${storeName}`,
  },
  description:
    'Authenticated luxury watches, sneakers, accessories and designer fashion. Fast delivery in Malawi, secure payments, and loyalty rewards.',
  applicationName: storeName,
  keywords: ['luxury watches Malawi', 'sneakers Lilongwe', 'designer fashion Africa', 'Two O\'Clock', 'World of Kiki Kicks'],
  openGraph: {
    type: 'website',
    siteName: storeName,
    locale: 'en_MW',
    title: storeName,
    description: 'Timeless luxury watches, sneakers and designer fashion.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <Providers>
          <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
            Skip to content
          </a>
          <SiteHeader />
          <main id="content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
