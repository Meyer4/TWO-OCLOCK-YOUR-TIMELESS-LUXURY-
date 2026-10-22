import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import type { RenderedEmail } from './emailTemplates.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export type MailStatus = 'sent' | 'logged' | 'failed';

/**
 * Sends an email through SMTP. Without SMTP configuration the email is logged so
 * development works without a mail provider. Failures are reported, never thrown,
 * so a mail outage cannot break checkout.
 */
export async function sendMail(to: string, email: RenderedEmail): Promise<{ status: MailStatus; error?: string }> {
  const transport = getTransporter();
  if (!transport) {
    logger.info({ to, subject: email.subject }, 'SMTP not configured; email logged instead of sent');
    return { status: 'logged' };
  }
  try {
    await transport.sendMail({ from: env.MAIL_FROM, to, subject: email.subject, text: email.text, html: email.html });
    return { status: 'sent' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown mail error';
    logger.error({ to, subject: email.subject, err: message }, 'Email delivery failed');
    return { status: 'failed', error: message };
  }
}
