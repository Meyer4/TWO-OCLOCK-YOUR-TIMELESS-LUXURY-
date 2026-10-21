import { Schema, model, type HydratedDocument } from 'mongoose';

export interface ICategory {
  name: string;
  slug: string;
  description?: string | undefined;
  image?: string | undefined;
  sortOrder: number;
  isActive: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 1000 },
    image: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CategoryDocument = HydratedDocument<ICategory>;
export const Category = model<ICategory>('Category', categorySchema);
