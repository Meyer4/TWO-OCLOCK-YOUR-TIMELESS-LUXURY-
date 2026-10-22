import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppOrderMessage, buildWhatsAppUrl } from '../src/lib/whatsapp.js';

test('WhatsApp order message contains order id, items, totals and discounts', () => {
  const message = buildWhatsAppOrderMessage({
    storeName: "Two O'Clock",
    orderNumber: 'TL-000123',
    customerName: 'Chikondi Phiri',
    phone: '+265 999 000 111',
    address: 'Area 47, Lilongwe, Central Region, Malawi',
    items: [{ name: 'Air Heritage Low', quantity: 2, unitPrice: 185000, size: '42', color: 'White' }],
    subtotal: 370000,
    shippingFee: 3000,
    discount: 10000,
    total: 363000,
  });
  assert.match(message, /Order ID: TL-000123/);
  assert.match(message, /Air Heritage Low \(Size 42, Colour White\) x2 - MWK 370,000/);
  assert.match(message, /Discount: -MWK 10,000/);
  assert.match(message, /Total: MWK 363,000/);
});

test('free delivery is labelled clearly', () => {
  const message = buildWhatsAppOrderMessage({
    storeName: 'X',
    orderNumber: 'TL-000001',
    customerName: 'A',
    phone: '1',
    address: 'B',
    items: [],
    subtotal: 1,
    shippingFee: 0,
    discount: 0,
    total: 1,
  });
  assert.match(message, /Delivery: Free \/ pickup/);
  assert.doesNotMatch(message, /Discount/);
});

test('wa.me link strips formatting and encodes the message', () => {
  const url = buildWhatsAppUrl('+265 (999) 000-111', 'Hi & bye');
  assert.equal(url, 'https://wa.me/265999000111?text=Hi%20%26%20bye');
  assert.equal(buildWhatsAppUrl('', 'Hi'), null);
});
