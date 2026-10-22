/** Base path the site is served under (e.g. "/TWO-OCLOCK-YOUR-TIMELESS-LUXURY-" on GitHub Pages). Empty for root deployments. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefix a root-relative static asset path with the base path. */
export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
