export type Role = 'customer' | 'admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  points: number;
  referralCode: string;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
}

export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  shortDescription?: string;
  description?: string;
  price: number;
  salePrice?: number | null;
  effectivePrice?: number;
  stock: number;
  sku: string;
  images: string[];
  video?: string;
  sizes: string[];
  colors: string[];
  specifications?: Array<{ label: string; value: string }>;
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount?: number;
  featured?: boolean;
  trending?: boolean;
  category?: ProductCategory | null;
  seo?: { title?: string; description?: string };
  createdAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Address {
  _id: string;
  label?: string;
  recipientName: string;
  country: string;
  city: string;
  district: string;
  street: string;
  phone: string;
  isDefault: boolean;
}

export interface OrderItem {
  product: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  size?: string;
  color?: string;
}

export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface Order {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  paymentProvider?: string;
  items: OrderItem[];
  customer: { name: string; email: string; phone?: string };
  shippingAddress: Omit<Address, '_id' | 'isDefault' | 'label'>;
  shippingMethod: string;
  shippingFee: number;
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  total: number;
  pointsEarned: number;
  trackingNumber?: string;
  courier?: string;
  statusHistory?: Array<{ status: OrderStatus; at: string; note?: string }>;
  createdAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  body: string;
  photos: string[];
  author: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minSpend: number;
  usageLimit: number | null;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string | null;
  whatsappNumber: string | null;
  maintenanceMode: boolean;
  currency: string;
}

export interface PaymentMethod {
  id: 'stripe' | 'airtel_money' | 'mpamba' | 'whatsapp';
  label: string;
  enabled: boolean;
}
