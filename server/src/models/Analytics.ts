import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IAnalyticsEvent {
  type: 'product_view' | 'add_to_cart' | 'checkout_started' | 'purchase';
  sessionId: string;
  product?: Types.ObjectId | null | undefined;
  user?: Types.ObjectId | null | undefined;
  createdAt: Date;
}

const analyticsSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, enum: ['product_view', 'add_to_cart', 'checkout_started', 'purchase'], required: true, index: true },
    sessionId: { type: String, required: true, maxlength: 100 },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

// Raw events are kept for 180 days, then removed automatically.
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export type AnalyticsDocument = HydratedDocument<IAnalyticsEvent>;
export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', analyticsSchema);
