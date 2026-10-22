import { AnalyticsEvent, Order, Product, User } from '../models/index.js';
import { PAID_STATUSES } from '../config/constants.js';

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const TZ = 'Africa/Blantyre';

const PERIODS: Record<Period, { format: string; start: () => Date }> = {
  daily: { format: '%Y-%m-%d', start: () => daysAgo(29) },
  weekly: { format: '%G-W%V', start: () => daysAgo(7 * 12 - 1) },
  monthly: { format: '%Y-%m', start: () => monthsAgo(11) },
  yearly: { format: '%Y', start: () => yearsAgo(4) },
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}
function monthsAgo(months: number): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}
function yearsAgo(years: number): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear() - years, 0, 1));
}

/** Sales dashboard data for a period: revenue/order series plus totals, best sellers and conversion. */
export async function getSalesAnalytics(period: Period) {
  const config = PERIODS[period];
  const from = config.start();
  const paidMatch = { status: { $in: PAID_STATUSES }, paidAt: { $gte: from } };

  const [series, totals, bestSellers, statusBreakdown, newCustomers, sessions] = await Promise.all([
    Order.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: { $dateToString: { format: config.format, date: '$paidAt', timezone: TZ } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: paidMatch },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, averageOrderValue: { $avg: '$total' } } },
    ]),
    Order.aggregate([
      { $match: paidMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: 'customer', createdAt: { $gte: from } }),
    AnalyticsEvent.aggregate([
      { $match: { type: 'product_view', createdAt: { $gte: from } } },
      { $group: { _id: '$sessionId' } },
      { $count: 'n' },
    ]),
  ]);

  const sessionCount = sessions[0]?.n ?? 0;
  const orderCount = totals[0]?.orders ?? 0;
  return {
    period,
    from,
    series: series.map((s) => ({ label: s._id as string, revenue: s.revenue as number, orders: s.orders as number })),
    totals: {
      revenue: Math.round(totals[0]?.revenue ?? 0),
      orders: orderCount,
      averageOrderValue: Math.round(totals[0]?.averageOrderValue ?? 0),
      newCustomers,
      conversionRate: sessionCount > 0 ? Math.round((orderCount / sessionCount) * 1000) / 10 : 0,
    },
    bestSellers,
    statusBreakdown: Object.fromEntries(statusBreakdown.map((s) => [s._id as string, s.count as number])),
  };
}

export async function getDashboardSummary() {
  const [pendingFulfilment, awaitingPayment, lowStock, customers, todayRevenue] = await Promise.all([
    Order.countDocuments({ status: { $in: ['paid', 'processing', 'packing'] } }),
    Order.countDocuments({ status: { $in: ['pending', 'awaiting_payment'] } }),
    Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
    User.countDocuments({ role: 'customer' }),
    (async () => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const [row] = await Order.aggregate([
        { $match: { status: { $in: PAID_STATUSES }, paidAt: { $gte: start } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]);
      return Math.round(row?.revenue ?? 0);
    })(),
  ]);
  return { pendingFulfilment, awaitingPayment, lowStock, customers, todayRevenue };
}

export async function recordEvent(input: { type: 'product_view' | 'add_to_cart' | 'checkout_started'; sessionId: string; productId?: string | undefined }, userId?: string) {
  await AnalyticsEvent.create({
    type: input.type,
    sessionId: input.sessionId,
    product: input.productId ?? null,
    user: userId ?? null,
  });
}
