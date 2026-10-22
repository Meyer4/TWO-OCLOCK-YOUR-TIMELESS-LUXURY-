/**
 * Static demo build (GitHub Pages). Enabled with NEXT_PUBLIC_DEMO=1 at build time.
 * In demo mode there is no API: read requests are answered from the seed catalogue
 * snapshot in ./catalog.ts, and write requests (sign-in, checkout, admin) are refused.
 */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === '1';
