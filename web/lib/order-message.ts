import { formatMWK } from '@/lib/format';
import type { CartItem } from '@/store/cart';

export interface OrderDetails {
  name: string;
  phone: string;
  method: 'delivery' | 'pickup';
  address?: string;
  payment: string;
  notes?: string;
}

export interface OrderTotals {
  subtotal: number;
  delivery: number;
  total: number;
}

function describeItem(item: CartItem): string {
  const variant = [item.size && `Size ${item.size}`, item.color].filter(Boolean).join(', ');
  return `${item.name}${variant ? ` (${variant})` : ''}`;
}

/** Plain-text order message that the customer sends to the store on WhatsApp. */
export function buildOrderMessage(items: CartItem[], totals: OrderTotals, details: OrderDetails, extra?: string): string {
  const lines = items.map(
    (item, i) => `${i + 1}. ${describeItem(item)} x${item.quantity} = ${formatMWK(item.unitPrice * item.quantity)}`,
  );
  const delivery =
    details.method === 'pickup' ? 'Pick up from the store' : `Delivery to: ${details.address ?? '(address to confirm)'}`;
  return [
    "Hello Two O'Clock, I'd like to place this order:",
    '',
    ...lines,
    '',
    `Subtotal: ${formatMWK(totals.subtotal)}`,
    `Delivery: ${totals.delivery === 0 ? 'Free / pick up' : formatMWK(totals.delivery)}`,
    `Total: ${formatMWK(totals.total)}`,
    '',
    `Name: ${details.name}`,
    `Phone: ${details.phone}`,
    delivery,
    `Payment: ${details.payment}`,
    details.notes ? `Notes: ${details.notes}` : null,
    extra ? `\n${extra}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}
