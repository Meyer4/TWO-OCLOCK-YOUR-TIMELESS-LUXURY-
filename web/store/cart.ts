'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_LINE_QTY = 10;

export interface CartItem {
  /** Unique per product + size + colour. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image?: string;
  unitPrice: number;
  listPrice: number;
  quantity: number;
  size?: string;
  color?: string;
  stock: number;
}

export function lineKey(productId: string, size?: string, color?: string): string {
  return [productId, size ?? '', color ?? ''].join('|');
}

interface CartState {
  items: CartItem[];
  savedForLater: CartItem[];
  /** Adds units, never exceeding stock or the per-line limit. Returns the quantity actually added. */
  add: (item: Omit<CartItem, 'key' | 'quantity'>, quantity?: number) => number;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  saveForLater: (key: string) => void;
  moveToCart: (key: string) => void;
  /** Refreshes price and stock from the server so stale carts are corrected. */
  syncProducts: (updates: Record<string, { unitPrice: number; listPrice: number; stock: number; name: string }>) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      savedForLater: [],

      add(item, quantity = 1) {
        const key = lineKey(item.productId, item.size, item.color);
        const existing = get().items.find((i) => i.key === key);
        const current = existing?.quantity ?? 0;
        const limit = Math.min(item.stock, MAX_LINE_QTY);
        const addable = Math.max(0, Math.min(quantity, limit - current));
        if (addable === 0) return 0;
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.key === key ? { ...i, quantity: current + addable, stock: item.stock, unitPrice: item.unitPrice, listPrice: item.listPrice } : i,
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, key, quantity: addable }] });
        }
        return addable;
      },

      setQuantity(key, quantity) {
        set({
          items: get().items
            .map((i) => {
              if (i.key !== key) return i;
              const clamped = Math.max(0, Math.min(quantity, i.stock, MAX_LINE_QTY));
              return { ...i, quantity: clamped };
            })
            .filter((i) => i.quantity > 0),
        });
      },

      remove(key) {
        set({ items: get().items.filter((i) => i.key !== key) });
      },

      saveForLater(key) {
        const item = get().items.find((i) => i.key === key);
        if (!item) return;
        set({
          items: get().items.filter((i) => i.key !== key),
          savedForLater: [item, ...get().savedForLater.filter((s) => s.key !== key)].slice(0, 50),
        });
      },

      moveToCart(key) {
        const item = get().savedForLater.find((i) => i.key === key);
        if (!item) return;
        set({
          savedForLater: get().savedForLater.filter((i) => i.key !== key),
          items: [...get().items.filter((i) => i.key !== key), { ...item, quantity: Math.max(1, Math.min(item.quantity, item.stock)) }],
        });
      },

      syncProducts(updates) {
        const apply = (list: CartItem[]) =>
          list
            .map((i) => {
              const u = updates[i.productId];
              if (!u) return i;
              return { ...i, unitPrice: u.unitPrice, listPrice: u.listPrice, stock: u.stock, name: u.name, quantity: Math.min(i.quantity, u.stock, MAX_LINE_QTY) };
            })
            .filter((i) => i.quantity > 0);
        set({ items: apply(get().items), savedForLater: apply(get().savedForLater) });
      },

      clear() {
        set({ items: [] });
      },
    }),
    { name: 'tl-cart', version: 1, partialize: (s) => ({ items: s.items, savedForLater: s.savedForLater }) },
  ),
);

export function cartTotals(items: CartItem[]) {
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return { count, subtotal };
}
