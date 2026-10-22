import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface IReview {
  product: Types.ObjectId;
  user: Types.ObjectId;
  order: Types.ObjectId;
  rating: number;
  title?: string | undefined;
  body: string;
  photos: string[];
  status: ReviewStatus;
  verifiedPurchase: true;
  moderatedBy?: Types.ObjectId | null | undefined;
  moderatedAt?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 120 },
    body: { type: String, required: true, maxlength: 3000 },
    photos: { type: [String], default: [], validate: [(v: string[]) => v.length <= 5, 'Maximum 5 photos'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    verifiedPurchase: { type: Boolean, default: true, immutable: true },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One review per customer per product.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export type ReviewDocument = HydratedDocument<IReview>;
export const Review = model<IReview>('Review', reviewSchema);
