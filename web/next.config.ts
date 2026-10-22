import type { NextConfig } from 'next';

const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/** Static demo build for GitHub Pages (NEXT_PUBLIC_DEMO=1): no server, no rewrites, no headers. */
const demo = process.env.NEXT_PUBLIC_DEMO === '1';
const basePath = demo ? process.env.NEXT_PUBLIC_BASE_PATH || undefined : undefined;

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(demo
    ? {
        output: 'export',
        trailingSlash: true,
        basePath,
        images: { unoptimized: true },
      }
    : {
        output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
        images: {
          formats: ['image/avif', 'image/webp'],
          remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
        },
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
        /**
         * The browser only talks to this origin. /api/* is proxied to the API so auth cookies
         * are first-party (SameSite=Lax works, and there is no cross-site CORS surface).
         */
        async rewrites() {
          return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
        },
      }),
};

export default nextConfig;
