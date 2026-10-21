import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IWishlist {
  user: Types.ObjectId;
  products: Types.ObjectId[];
  updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export type WishlistDocument = HydratedDocument<IWishlist>;
export const Wishlist = model<IWishlist>('Wishlist', wishlistSchema);
