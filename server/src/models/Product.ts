import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ISpecification {
  label: string;
  value: string;
}

export interface IProduct {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | undefined;
  category: Types.ObjectId;
  brand: string;
  price: number;
  salePrice?: number | null | undefined;
  /** Available (sellable) units. */
  stock: number;
  /** Units held by pending, unpaid orders. */
  reservedStock: number;
  /** Units sold (paid orders). Drives "trending". */
  soldCount: number;
  viewCount: number;
  sku: string;
  images: string[];
  video?: string | undefined;
  sizes: string[];
  colors: string[];
  specifications: ISpecification[];
  rating: number;
  reviewCount: number;
  tags: string[];
  featured: boolean;
  trending: boolean;
  isActive: boolean;
  seo?: { title?: string | undefined; description?: string | undefined } | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, maxlength: 10000 },
    shortDescription: { type: String, maxlength: 300 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: String, required: true, trim: true, maxlength: 80, index: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, min: 0, default: 0 },
    soldCount: { type: Number, min: 0, default: 0 },
    viewCount: { type: Number, min: 0, default: 0 },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    images: { type: [String], default: [] },
    video: String,
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    specifications: {
      type: [{ label: String, value: String, _id: false }],
      default: [],
    },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    tags: { type: [String], default: [], index: true },
    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    seo: { title: String, description: String },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', brand: 'text', tags: 'text', description: 'text', shortDescription: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ soldCount: -1 });

export type ProductDocument = HydratedDocument<IProduct>;
export const Product = model<IProduct>('Product', productSchema);
