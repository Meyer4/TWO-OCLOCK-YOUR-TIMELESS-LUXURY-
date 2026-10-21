import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface INotification {
  user?: Types.ObjectId | null | undefined;
  channel: 'email' | 'in_app';
  type: string;
  to?: string | undefined;
  subject: string;
  body?: string | undefined;
  status: 'sent' | 'logged' | 'failed' | 'unread' | 'read';
  error?: string | undefined;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    channel: { type: String, enum: ['email', 'in_app'], required: true },
    type: { type: String, required: true, index: true },
    to: String,
    subject: { type: String, required: true },
    body: { type: String, maxlength: 5000 },
    status: { type: String, enum: ['sent', 'logged', 'failed', 'unread', 'read'], required: true },
    error: String,
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  { versionKey: false },
);

export type NotificationDocument = HydratedDocument<INotification>;
export const Notification = model<INotification>('Notification', notificationSchema);
