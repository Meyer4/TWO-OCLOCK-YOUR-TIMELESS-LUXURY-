const DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Blantyre',
});

/** Malawi Kwacha, whole units. */
export function formatMWK(amount: number): string {
  return `MWK ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatDate(value: string | Date): string {
  return DATE.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return DATE_TIME.format(new Date(value));
}

export function effectivePrice(p: { price: number; salePrice?: number | null }): number {
  return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Processing',
  packing: 'Packing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const PAYMENT_LABELS: Record<string, string> = {
  stripe: 'Card / Apple Pay / Google Pay',
  airtel_money: 'Airtel Money',
  mpamba: 'TNM Mpamba',
  whatsapp: 'WhatsApp order',
  manual: 'Confirmed by our team',
};

export const SHIPPING_LABELS: Record<string, string> = {
  standard: 'Standard delivery',
  express: 'Express delivery (Lilongwe)',
  pickup: 'Store pickup (Lilongwe)',
};
