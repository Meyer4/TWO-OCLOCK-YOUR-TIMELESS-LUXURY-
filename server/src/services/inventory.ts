import { Types } from 'mongoose';
import { Product, Notification } from '../models/index.js';
import { conflict } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { getStoreSettings } from './settings.js';

export interface StockLine {
  productId: Types.ObjectId | string;
  quantity: number;
}

/**
 * Reserves stock for an order. Each product is decremented with a conditional
 * update (stock >= quantity), so concurrent checkouts cannot oversell.
 * If any line fails, earlier reservations are released before throwing.
 */
export async function reserveStock(lines: StockLine[]): Promise<void> {
  const done: StockLine[] = [];
  for (const line of lines) {
    const result = await Product.updateOne(
      { _id: line.productId, isActive: true, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity, reservedStock: line.quantity } },
    );
    if (result.modifiedCount !== 1) {
      await releaseReservation(done);
      const product = await Product.findById(line.productId).select('name stock').lean();
      const name = product?.name ?? 'an item';
      const left = product?.stock ?? 0;
      throw conflict(
        left > 0
          ? `Only ${left} left of ${name}. Please update your cart.`
          : `${name} is out of stock. Please update your cart.`,
      );
    }
    done.push(line);
  }
  await checkLowStock(lines.map((l) => l.productId));
}

/** Unpaid order cancelled or expired: return reserved units to sellable stock. */
export async function releaseReservation(lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    await Product.updateOne(
      { _id: line.productId },
      { $inc: { stock: line.quantity, reservedStock: -line.quantity } },
    );
  }
}

/** Payment confirmed: move reserved units to sold. */
export async function convertReservationToSale(lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    await Product.updateOne(
      { _id: line.productId },
      { $inc: { reservedStock: -line.quantity, soldCount: line.quantity } },
    );
  }
}

/** Refund of a paid order: sold units go back to sellable stock. */
export async function restockSold(lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    await Product.updateOne(
      { _id: line.productId },
      { $inc: { soldCount: -line.quantity, stock: line.quantity } },
    );
  }
}

/** Creates one unread alert per product per day when stock is at or below the threshold. */
export async function checkLowStock(productIds: Array<Types.ObjectId | string>): Promise<void> {
  try {
    const { lowStockThreshold } = await getStoreSettings();
    const products = await Product.find({
      _id: { $in: productIds },
      stock: { $lte: lowStockThreshold },
    })
      .select('name sku stock')
      .lean();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const product of products) {
      const subject = `Low stock: ${product.name} (${product.sku})`;
      const recent = await Notification.exists({ type: 'low_stock', subject, createdAt: { $gte: since } });
      if (recent) continue;
      await Notification.create({
        channel: 'in_app',
        type: 'low_stock',
        subject,
        body: `Only ${product.stock} units remaining.`,
        status: 'unread',
      });
      logger.warn({ sku: product.sku, stock: product.stock }, 'Low stock alert');
    }
  } catch (err) {
    logger.error({ err }, 'Low stock check failed');
  }
}
