import { Notification } from '../models/index.js';
import { sendMail } from '../lib/mailer.js';
import type { RenderedEmail } from '../lib/emailTemplates.js';
import { logger } from '../lib/logger.js';
import type { Types } from 'mongoose';

/**
 * Sends an email and records it. Never throws: notification problems must not
 * break the business operation that triggered them.
 */
export async function sendEmailNotification(params: {
  to: string;
  type: string;
  email: RenderedEmail;
  userId?: Types.ObjectId | string | null;
}): Promise<void> {
  try {
    const result = await sendMail(params.to, params.email);
    await Notification.create({
      user: params.userId ?? null,
      channel: 'email',
      type: params.type,
      to: params.to,
      subject: params.email.subject,
      body: params.email.text.slice(0, 4900),
      status: result.status,
      error: result.error,
    });
  } catch (err) {
    logger.error({ err, type: params.type }, 'Failed to record notification');
  }
}

export async function createInAppNotification(params: {
  type: string;
  subject: string;
  body?: string;
  userId?: Types.ObjectId | string | null;
}): Promise<void> {
  try {
    await Notification.create({
      user: params.userId ?? null,
      channel: 'in_app',
      type: params.type,
      subject: params.subject,
      body: params.body,
      status: 'unread',
    });
  } catch (err) {
    logger.error({ err, type: params.type }, 'Failed to create in-app notification');
  }
}
