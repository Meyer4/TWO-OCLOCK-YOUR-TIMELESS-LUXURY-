'use client';

import { api } from '@/lib/api';

const KEY = 'tl-session';

/** Anonymous per-browser session id used for conversion-rate calculations. */
export function sessionId(): string {
  let id = localStorage.getItem(KEY);
  if (!id || id.length < 8) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Fire-and-forget event tracking. Never throws into the UI. */
export function track(type: 'product_view' | 'add_to_cart' | 'checkout_started', productId?: string): void {
  if (typeof window === 'undefined') return;
  api('/analytics/events', { method: 'POST', body: { type, sessionId: sessionId(), productId }, noRefresh: true }).catch(() => undefined);
}
