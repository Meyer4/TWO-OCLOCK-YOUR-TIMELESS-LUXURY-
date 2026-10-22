import { formatMWK } from './format.js';

export interface WhatsAppLine {
  name: string;
  quantity: number;
  unitPrice: number;
  size?: string | undefined;
  color?: string | undefined;
}

export interface WhatsAppOrderMessageInput {
  storeName: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: WhatsAppLine[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
}

function describeLine(item: WhatsAppLine, index: number): string {
  const variant = [item.size && `Size ${item.size}`, item.color && `Colour ${item.color}`].filter(Boolean).join(', ');
  const suffix = variant ? ` (${variant})` : '';
  return `${index + 1}. ${item.name}${suffix} x${item.quantity} - ${formatMWK(item.unitPrice * item.quantity)}`;
}

export function buildWhatsAppOrderMessage(input: WhatsAppOrderMessageInput): string {
  const lines: string[] = [
    `Hello ${input.storeName}, I would like to place an order.`,
    '',
    `Order ID: ${input.orderNumber}`,
    `Name: ${input.customerName}`,
    `Phone: ${input.phone}`,
    `Address: ${input.address}`,
    '',
    'Items:',
    ...input.items.map(describeLine),
    '',
    `Subtotal: ${formatMWK(input.subtotal)}`,
    `Delivery: ${input.shippingFee === 0 ? 'Free / pickup' : formatMWK(input.shippingFee)}`,
  ];
  if (input.discount > 0) lines.push(`Discount: -${formatMWK(input.discount)}`);
  lines.push(`Total: ${formatMWK(input.total)}`);
  return lines.join('\n');
}

/** Builds a wa.me link. Returns null when no store WhatsApp number is configured. */
export function buildWhatsAppUrl(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
