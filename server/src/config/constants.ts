/**
 * Business rules that are product decisions rather than deployment settings.
 * Changing these changes how money, stock and loyalty behave, so keep them in one place.
 */

export const CURRENCY = 'MWK' as const;

export const ORDER_STATUSES = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'packing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed status transitions. `paid` is only reachable through the payment flow. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['awaiting_payment', 'paid', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  paid: ['processing', 'refunded'],
  processing: ['packing', 'refunded'],
  packing: ['shipped', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** Statuses an admin may set manually via the status endpoint. */
export const ADMIN_STATUS_TARGETS: readonly OrderStatus[] = ['processing', 'packing', 'shipped', 'delivered'];

/** Statuses in which the customer has paid (or is treated as having paid) for the goods. */
export const PAID_STATUSES: readonly OrderStatus[] = ['paid', 'processing', 'packing', 'shipped', 'delivered'];

export const UNPAID_STATUSES: readonly OrderStatus[] = ['pending', 'awaiting_payment'];

export const PAYMENT_PROVIDERS = ['stripe', 'airtel_money', 'mpamba', 'paypal', 'manual', 'whatsapp'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const LOW_STOCK_THRESHOLD = 5;
export const UNPAID_ORDER_EXPIRY_HOURS = 24;

/** Loyalty: 1 point per MWK 1,000 spent, each point redeems MWK 10, max 50% of payable amount. */
export const POINTS_EARN_PER_MWK = 1000;
export const POINTS_VALUE_MWK = 10;
export const MAX_POINTS_REDEEM_RATIO = 0.5;

/** Referral rewards, granted when the referred friend's first order is paid. */
export const REFERRAL_FRIEND_BONUS_POINTS = 200;
export const REFERRER_BONUS_POINTS = 500;

export const SHIPPING_METHODS = {
  standard: { label: 'Standard delivery (Lilongwe & nationwide)', fee: 3000, freeOver: 150000 },
  express: { label: 'Express delivery (same or next day, Lilongwe)', fee: 8000, freeOver: null },
  pickup: { label: 'Store pickup, Lilongwe', fee: 0, freeOver: null },
} as const;
export type ShippingMethodKey = keyof typeof SHIPPING_METHODS;

export const MAX_LINE_QUANTITY = 10;
export const MAX_ITEMS_PER_ORDER = 25;
export const MAX_ADDRESSES_PER_USER = 10;
