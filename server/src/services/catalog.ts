import { Types } from 'mongoose';
import { Category, Product, type IProduct } from '../models/index.js';
import { badRequest, notFound } from '../lib/errors.js';
import { escapeRegex, slugify } from '../lib/format.js';
import { fuzzyScore, tokenize } from '../lib/fuzzy.js';
import { randomToken } from '../lib/crypto.js';

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'bestselling';

export interface ProductListParams {
  q?: string | undefined;
  category?: string | undefined;
  brand?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  inStock?: boolean | undefined;
  size?: string | undefined;
  color?: string | undefined;
  sort: ProductSort;
  featured?: boolean | undefined;
  page: number;
  limit: number;
}

/** Effective (sale-aware) unit price, computed in Mongo so sorting and filtering match what the customer pays. */
const EFFECTIVE_PRICE = {
  $cond: [{ $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$price'] }] }, '$salePrice', '$price'],
};

const SORTS: Record<ProductSort, Record<string, 1 | -1>> = {
  featured: { featured: -1, soldCount: -1, createdAt: -1 },
  'price-asc': { effectivePrice: 1, _id: 1 },
  'price-desc': { effectivePrice: -1, _id: 1 },
  newest: { createdAt: -1 },
  rating: { rating: -1, reviewCount: -1 },
  bestselling: { soldCount: -1, createdAt: -1 },
};

export interface ProductSummary {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  brand: string;
  shortDescription?: string;
  price: number;
  salePrice?: number | null;
  effectivePrice: number;
  stock: number;
  sku: string;
  images: string[];
  video?: string;
  sizes: string[];
  colors: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  featured: boolean;
  trending: boolean;
  category: { _id: Types.ObjectId; name: string; slug: string } | null;
  createdAt: Date;
}

const SUMMARY_PROJECTION = {
  description: 0,
  specifications: 0,
  reservedStock: 0,
  viewCount: 0,
  seo: 0,
  isActive: 0,
  updatedAt: 0,
};

async function categoryIdFromSlug(slug: string): Promise<Types.ObjectId | null> {
  const category = await Category.findOne({ slug: slug.toLowerCase(), isActive: true }).select('_id').lean();
  return category?._id ?? null;
}

async function baseFilter(params: ProductListParams): Promise<Record<string, unknown>> {
  const filter: Record<string, unknown> = { isActive: true };
  if (params.category) {
    const id = await categoryIdFromSlug(params.category);
    filter.category = id ?? new Types.ObjectId(); // unknown category -> no results
  }
  if (params.brand) filter.brand = new RegExp(`^${escapeRegex(params.brand)}$`, 'i');
  if (params.inStock) filter.stock = { $gt: 0 };
  if (params.minRating !== undefined) filter.rating = { $gte: params.minRating };
  if (params.size) filter.sizes = params.size;
  if (params.color) filter.colors = new RegExp(`^${escapeRegex(params.color)}$`, 'i');
  if (params.featured !== undefined) filter.featured = params.featured;
  return filter;
}

function priceFilter(params: ProductListParams): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];
  if (params.minPrice !== undefined) clauses.push({ $gte: [EFFECTIVE_PRICE, params.minPrice] });
  if (params.maxPrice !== undefined) clauses.push({ $lte: [EFFECTIVE_PRICE, params.maxPrice] });
  return clauses;
}

function toSummary(doc: Record<string, unknown>): ProductSummary {
  const { categoryDoc, category: _ignored, ...rest } = doc as Record<string, unknown> & {
    categoryDoc?: Array<{ _id: Types.ObjectId; name: string; slug: string }>;
  };
  const cat = categoryDoc?.[0];
  return { ...(rest as unknown as ProductSummary), category: cat ? { _id: cat._id, name: cat.name, slug: cat.slug } : null };
}

/** Lists products with search, filters, sorting and pagination. Falls back to fuzzy matching on typos. */
export async function listProducts(params: ProductListParams) {
  const base = await baseFilter(params);
  const pricing = priceFilter(params);
  const tokens = params.q ? tokenize(params.q) : [];

  const buildPipeline = (filter: Record<string, unknown>) => {
    const match = pricing.length > 0 ? { ...filter, $expr: { $and: pricing } } : filter;
    return [
      { $match: match },
      { $addFields: { effectivePrice: EFFECTIVE_PRICE } },
      { $sort: SORTS[params.sort] },
      {
        $facet: {
          items: [
            { $skip: (params.page - 1) * params.limit },
            { $limit: params.limit },
            { $lookup: { from: Category.collection.name, localField: 'category', foreignField: '_id', as: 'categoryDoc' } },
            { $project: SUMMARY_PROJECTION },
          ],
          total: [{ $count: 'n' }],
        },
      },
    ];
  };

  const regexFilter = tokens.length
    ? {
        ...base,
        $and: tokens.map((t) => {
          const re = new RegExp(escapeRegex(t), 'i');
          return { $or: [{ name: re }, { brand: re }, { tags: re }, { shortDescription: re }, { description: re }] };
        }),
      }
    : base;

  let result = await Product.aggregate(buildPipeline(regexFilter));
  let total = result[0]?.total[0]?.n ?? 0;
  let usedFuzzy = false;

  if (tokens.length && total === 0 && params.q) {
    // Typo tolerance: score candidates by fuzzy token matching over names, brands and tags.
    const candidates = await Product.find(base).select('name brand tags').limit(1000).lean();
    const ids = candidates
      .filter((c) => fuzzyScore(params.q!, `${c.name} ${c.brand} ${(c.tags ?? []).join(' ')}`) >= 0.5)
      .map((c) => c._id);
    usedFuzzy = ids.length > 0;
    result = await Product.aggregate(buildPipeline({ ...base, _id: { $in: ids } }));
    total = result[0]?.total[0]?.n ?? 0;
  }

  const items = (result[0]?.items ?? []).map(toSummary);
  return {
    items,
    total,
    page: params.page,
    pages: Math.max(1, Math.ceil(total / params.limit)),
    fuzzy: usedFuzzy,
  };
}

/** Facet values for filter controls, scoped to the current category/brand/search. */
export async function productFacets(params: Pick<ProductListParams, 'category' | 'brand' | 'q'>) {
  const base = await baseFilter({ ...params, sort: 'featured', page: 1, limit: 1 });
  const [brands, sizes, colors, priceStats] = await Promise.all([
    Product.distinct('brand', base),
    Product.distinct('sizes', base),
    Product.distinct('colors', base),
    Product.aggregate([
      { $match: base },
      { $addFields: { effectivePrice: EFFECTIVE_PRICE } },
      { $group: { _id: null, min: { $min: '$effectivePrice' }, max: { $max: '$effectivePrice' } } },
    ]),
  ]);
  return {
    brands: brands.sort(),
    sizes: sizes.sort(),
    colors: colors.sort(),
    priceRange: { min: priceStats[0]?.min ?? 0, max: priceStats[0]?.max ?? 0 },
  };
}

/** Typeahead suggestions: prefix/contains matches first, fuzzy matches to fill gaps. */
export async function suggestProducts(q: string) {
  const tokens = tokenize(q);
  if (tokens.length === 0) return { products: [], brands: [] };
  const re = new RegExp(escapeRegex(tokens.join('.*')), 'i');
  const select = 'name slug brand images price salePrice';

  const direct = await Product.find({ isActive: true, $or: [{ name: re }, { brand: re }, { tags: re }] })
    .select(select)
    .limit(6)
    .lean();
  let products = direct;
  if (products.length < 4) {
    const candidates = await Product.find({ isActive: true }).select(`${select} tags`).limit(800).lean();
    const seen = new Set(products.map((p) => String(p._id)));
    for (const c of candidates) {
      if (products.length >= 6) break;
      if (seen.has(String(c._id))) continue;
      if (fuzzyScore(q, `${c.name} ${c.brand}`) >= 0.6) {
        products.push(c);
        seen.add(String(c._id));
      }
    }
  }
  const brands = await Product.distinct('brand', { isActive: true, brand: re });
  return { products, brands: brands.slice(0, 5) };
}

export async function featuredProducts(categorySlug?: string, limit = 8) {
  const filter: Record<string, unknown> = { isActive: true, featured: true };
  if (categorySlug) {
    const id = await categoryIdFromSlug(categorySlug);
    filter.category = id ?? new Types.ObjectId();
  }
  return Product.find(filter).sort({ soldCount: -1, createdAt: -1 }).limit(limit).populate('category', 'name slug').lean();
}

/** Trending = highest sales (soldCount), with views as a tie-breaker so new stores still show activity. */
export async function trendingProducts(categorySlug?: string, limit = 8) {
  const filter: Record<string, unknown> = { isActive: true };
  if (categorySlug) {
    const id = await categoryIdFromSlug(categorySlug);
    filter.category = id ?? new Types.ObjectId();
  }
  return Product.find(filter)
    .sort({ soldCount: -1, viewCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .lean();
}

export async function getProductBySlug(slug: string) {
  const product = await Product.findOne({ slug: slug.toLowerCase(), isActive: true })
    .populate('category', 'name slug')
    .lean();
  if (!product) throw notFound('This piece is no longer available');
  void Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } }).catch(() => undefined);
  return product;
}

/** Related = same category, best sellers first. Similar = shares tags or brand, excluding related. */
export async function relatedAndSimilar(productId: string, limit = 4) {
  const product = await Product.findById(productId).lean();
  if (!product) throw notFound('Product not found');
  const related = await Product.find({ isActive: true, category: product.category, _id: { $ne: product._id } })
    .sort({ soldCount: -1 })
    .limit(limit)
    .lean();
  const excluded = [product._id, ...related.map((r) => r._id)];
  const similarMatch: Record<string, unknown> = { isActive: true, _id: { $nin: excluded } };
  similarMatch.$or = [
    ...(product.tags.length ? [{ tags: { $in: product.tags } }] : []),
    { brand: product.brand },
  ];
  const similar = await Product.find(similarMatch).sort({ rating: -1 }).limit(limit).lean();
  return { related, similar };
}

export async function productsByIds(ids: string[]) {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id)).slice(0, 20);
  const products = await Product.find({ _id: { $in: valid }, isActive: true })
    .select('name slug brand images price salePrice stock')
    .lean();
  const order = new Map(valid.map((id, i) => [id, i]));
  return products.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
}

async function uniqueSlug(name: string, given?: string): Promise<string> {
  const base = given ? slugify(given) : slugify(name);
  if (!base) throw badRequest('Could not create a URL slug from this name');
  let candidate = base;
  while (await Product.exists({ slug: candidate })) {
    candidate = `${base}-${randomToken(3)}`;
  }
  return candidate;
}

export async function createProduct(input: Record<string, unknown> & { name: string; slug?: string | undefined; price: number; salePrice?: number | null | undefined }) {
  if (input.salePrice != null && input.salePrice >= input.price) {
    throw badRequest('Sale price must be lower than the regular price', { salePrice: ['Must be lower than price'] });
  }
  const slug = await uniqueSlug(input.name, input.slug);
  return Product.create({ ...input, slug });
}

export async function updateProduct(id: string, patch: Partial<IProduct> & Record<string, unknown>) {
  const product = await Product.findById(id);
  if (!product) throw notFound('Product not found');
  const next = { price: product.price, salePrice: product.salePrice ?? null, ...patch };
  if (next.salePrice != null && next.salePrice >= next.price) {
    throw badRequest('Sale price must be lower than the regular price', { salePrice: ['Must be lower than price'] });
  }
  if (patch.slug && patch.slug !== product.slug) {
    patch.slug = await uniqueSlug(product.name, patch.slug);
  }
  product.set(patch);
  await product.save();
  return product;
}
