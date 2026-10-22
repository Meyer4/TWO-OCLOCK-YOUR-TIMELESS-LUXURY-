import { CURRENCY } from '../config/constants.js';

/** Formats an amount in Malawi Kwacha, e.g. 150000 -> "MWK 150,000". */
export function formatMWK(amount: number): string {
  return `${CURRENCY} ${Math.round(amount).toLocaleString('en-US')}`;
}

/** Customer-facing order reference: sequence 1 -> "TL-000001". */
export function formatOrderNumber(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError('Order sequence must be a positive integer');
  }
  return `TL-${String(sequence).padStart(6, '0')}`;
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
