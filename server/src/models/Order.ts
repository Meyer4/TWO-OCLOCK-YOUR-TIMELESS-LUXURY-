import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import { ORDER_STATUSES, PAYMENT_PROVIDERS, type OrderStatus, type PaymentProvider } from '../config/constants.js';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type InventoryState = 'reserved' | 'sold' | 'released' | 'restocked';

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  image?: string | undefined;
  unitPrice: number;
  quantity: number;
  size?: string | undefined;
  color?: string | undefined;
}

export interface IOrderAddress {
  recipientName: string;
  country: string;
  city: string;
  district: string;
  street: string;
  phone: string;
}

export interface IOrder {
  orderNumber: string;
  user: Types.ObjectId;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider?: PaymentProvider | undefined;
  items: IOrderItem[];
  customer: { name: string; email: string; phone?: string | undefined };
  shippingAddress: IOrderAddress;
  shippingMethod: string;
  shippingFee: number;
  subtotal: number;
  couponCode?: string | undefined;
  couponDiscount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  total: number;
  pointsEarned: number;
  inventoryState: InventoryState;
  statusHistory: { status: OrderStatus; at: Date; note?: string | undefined }[];
  notes?: string | undefined;
  trackingNumber?: string | undefined;
  courier?: string | undefined;
  expiresAt?: Date | null | undefined;
  paidAt?: Date | null | undefined;
  shippedAt?: Date | null | undefined;
  deliveredAt?: Date | null | undefined;
  cancelledAt?: Date | null | undefined;
  refundedAt?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    image: String,
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    size: String,
    color: String,
  },
  { _id: false },
);

const addressSchema = new Schema<IOrderAddress>(
  {
    recipientName: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    street: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'], default: 'unpaid' },
    paymentProvider: { type: String, enum: PAYMENT_PROVIDERS },
    items: { type: [itemSchema], required: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
    },
    shippingAddress: { type: addressSchema, required: true },
    shippingMethod: { type: String, required: true },
    shippingFee: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    couponCode: String,
    couponDiscount: { type: Number, default: 0, min: 0 },
    pointsRedeemed: { type: Number, default: 0, min: 0 },
    pointsDiscount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    pointsEarned: { type: Number, default: 0, min: 0 },
    inventoryState: { type: String, enum: ['reserved', 'sold', 'released', 'restocked'], default: 'reserved' },
    statusHistory: {
      type: [{ status: { type: String, enum: ORDER_STATUSES }, at: Date, note: String, _id: false }],
      default: [],
    },
    notes: { type: String, maxlength: 1000 },
    trackingNumber: String,
    courier: String,
    expiresAt: { type: Date, default: null, index: true },
    paidAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    refundedAt: Date,
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'items.product': 1, status: 1 });

export type OrderDocument = HydratedDocument<IOrder>;
export const Order = model<IOrder>('Order', orderSchema);
