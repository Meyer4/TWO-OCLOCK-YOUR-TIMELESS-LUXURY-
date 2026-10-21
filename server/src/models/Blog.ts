import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IBlogPost {
  title: string;
  slug: string;
  excerpt: string;
  /** Markdown, rendered on the storefront. */
  content: string;
  coverImage?: string | undefined;
  category: string;
  tags: string[];
  author: Types.ObjectId;
  status: 'draft' | 'published';
  publishedAt?: Date | null | undefined;
  seo?: { title?: string | undefined; description?: string | undefined; keywords?: string[] | undefined } | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, required: true, maxlength: 400 },
    content: { type: String, required: true, maxlength: 100000 },
    coverImage: String,
    category: { type: String, required: true, trim: true, maxlength: 60, index: true },
    tags: { type: [String], default: [] },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    seo: { title: String, description: String, keywords: [String] },
  },
  { timestamps: true },
);

export type BlogDocument = HydratedDocument<IBlogPost>;
export const BlogPost = model<IBlogPost>('BlogPost', blogSchema);
