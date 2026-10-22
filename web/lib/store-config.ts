/**
 * Store details used across the static storefront. Edit here (and in data/catalog.json for products).
 * Only include values you have confirmed; empty values hide the matching link.
 */
export const STORE = {
  name: "Two O'Clock",
  tagline: 'Timeless Luxury',
  /** WhatsApp number in international format, digits only. From the @twoclock_watch_store TikTok profile. */
  whatsapp: '265996564740',
  /** Shown as +265 996 564 740 in the UI. */
  whatsappDisplay: '+265 996 564 740',
  tiktok: 'https://www.tiktok.com/@twoclock_watch_store',
  instagram: '',
  facebook: '',
  /** Used to convert MWK totals to USD for PayPal (PayPal does not accept MWK). Approximate; adjust to your rate. */
  mwkPerUsd: 1750,
} as const;

/** PayPal client ID (public). Without it the PayPal option is shown as "not connected yet". */
export const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '';

/** Opens a WhatsApp chat to the store with a pre-filled message. */
export function waLink(message?: string): string {
  const base = `https://wa.me/${STORE.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
