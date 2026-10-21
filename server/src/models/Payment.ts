import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import { PAYMENT_PROVIDERS, type PaymentProvider } from '../config/constants.js';

export type PaymentRecordStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface IPayment {
  order: Types.ObjectId;
  user: Types.ObjectId;
  provider: PaymentProvider;
  /** Our reference, sent to the provider and echoed back in callbacks. */
  reference: string;
  /** Provider's identifier (e.g. Stripe PaymentIntent id). */
  providerRef?: string | undefined;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  failureReason?: string | undefined;
  /** Sanitised copy of the last provider payload, for audit and reconciliation. */
  providerPayload?: Record<string, unknown> | undefined;
  paidAt?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    reference: { type: String, required: true, unique: true },
    providerRef: { type: String, index: true, sparse: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'MWK' },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending', index: true },
    failureReason: String,
    providerPayload: { type: Schema.Types.Mixed },
    paidAt: Date,
  },
  { timestamps: true },
);

export type PaymentDocument = HydratedDocument<IPayment>;
export const Payment = model<IPayment>('Payment', paymentSchema);
