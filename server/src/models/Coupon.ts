import { Schema, model, type HydratedDocument } from 'mongoose';

export interface ICoupon {
  code: string;
  description?: string | undefined;
  type: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt?: Date | null | undefined;
  expiresAt?: Date | null | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, maxlength: 300 },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minSpend: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponDocument = HydratedDocument<ICoupon>;
export const Coupon = model<ICoupon>('Coupon', couponSchema);
