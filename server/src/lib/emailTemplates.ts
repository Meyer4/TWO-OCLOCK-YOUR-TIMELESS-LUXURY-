import { env } from '../config/env.js';
import { formatMWK } from './format.js';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0b0c;font-family:Georgia,serif;color:#f5f1e8">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="letter-spacing:.3em;text-transform:uppercase;font-size:11px;color:#c9a96e;margin:0 0 24px">${escapeHtml(env.STORE_NAME)}</p>
<h1 style="font-weight:400;font-size:26px;margin:0 0 16px">${escapeHtml(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#d9d4c7">${bodyHtml}</div>
<p style="font-size:12px;color:#7d786c;margin-top:40px">Need help? Reply to this email or contact ${escapeHtml(env.STORE_SUPPORT_EMAIL)}.</p>
</div></body></html>`;
}

function button(label: string, url: string): string {
  return `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#c9a96e;color:#0b0b0c;padding:12px 22px;text-decoration:none;letter-spacing:.08em;text-transform:uppercase;font-size:12px">${escapeHtml(label)}</a></p>`;
}

export function welcomeEmail(name: string, verifyUrl: string): RenderedEmail {
  const subject = `Welcome to ${env.STORE_NAME}`;
  const text = `Hi ${name},\n\nWelcome to ${env.STORE_NAME}. Please verify your email address: ${verifyUrl}`;
  const html = layout(
    `Welcome, ${name}`,
    `<p>Thank you for joining us. Verify your email to secure your account.</p>${button('Verify email', verifyUrl)}`,
  );
  return { subject, text, html };
}

export function passwordResetEmail(name: string, resetUrl: string, ttlMinutes: number): RenderedEmail {
  const subject = 'Reset your password';
  const text = `Hi ${name},\n\nReset your password using this link (valid ${ttlMinutes} minutes): ${resetUrl}\n\nIf you did not request this, ignore this email.`;
  const html = layout(
    'Reset your password',
    `<p>This link is valid for ${ttlMinutes} minutes. If you did not request a reset, you can ignore this email.</p>${button('Choose a new password', resetUrl)}`,
  );
  return { subject, text, html };
}

export function orderEmail(
  kind: 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'refunded',
  data: { name: string; orderNumber: string; total: number; trackingUrl: string; trackingNumber?: string | undefined },
): RenderedEmail {
  const copy: Record<typeof kind, { subject: string; heading: string; line: string }> = {
    confirmed: {
      subject: `Order ${data.orderNumber} received`,
      heading: 'Order received',
      line: 'We have received your order and will confirm payment shortly.',
    },
    paid: {
      subject: `Payment received for ${data.orderNumber}`,
      heading: 'Payment confirmed',
      line: 'Thank you. Your payment has been confirmed and your order is being prepared.',
    },
    shipped: {
      subject: `Order ${data.orderNumber} is on its way`,
      heading: 'Your order has shipped',
      line: data.trackingNumber ? `Tracking number: ${data.trackingNumber}` : 'Your order is on its way to you.',
    },
    delivered: {
      subject: `Order ${data.orderNumber} delivered`,
      heading: 'Delivered',
      line: 'Your order has been delivered. We hope you love it. Leave a review to earn loyalty points.',
    },
    refunded: {
      subject: `Refund issued for ${data.orderNumber}`,
      heading: 'Refund issued',
      line: 'Your refund has been issued. It may take a few working days to appear on your statement.',
    },
  };
  const c = copy[kind];
  const text = `Hi ${data.name},\n\n${c.line}\n\nOrder: ${data.orderNumber}\nTotal: ${formatMWK(data.total)}\nTrack: ${data.trackingUrl}`;
  const html = layout(
    c.heading,
    `<p>Hi ${escapeHtml(data.name)},</p><p>${escapeHtml(c.line)}</p><p>Order <strong>${escapeHtml(data.orderNumber)}</strong><br/>Total <strong>${escapeHtml(formatMWK(data.total))}</strong></p>${button('Track order', data.trackingUrl)}`,
  );
  return { subject: c.subject, text, html };
}

export function contactEmail(data: { name: string; email: string; message: string }): RenderedEmail {
  return {
    subject: `New contact enquiry from ${data.name}`,
    text: `From: ${data.name} <${data.email}>\n\n${data.message}`,
    html: layout('New enquiry', `<p><strong>${escapeHtml(data.name)}</strong> (${escapeHtml(data.email)})</p><p>${escapeHtml(data.message).replace(/\n/g, '<br/>')}</p>`),
  };
}
