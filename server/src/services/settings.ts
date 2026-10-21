import { Settings } from '../models/index.js';
import { env } from '../config/env.js';

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone?: string | undefined;
  whatsappNumber: string;
  lowStockThreshold: number;
  maintenanceMode: boolean;
}

const CACHE_MS = 60_000;
let cache: { value: StoreSettings; at: number } | null = null;

/** Returns store settings, creating the singleton from environment defaults on first use. */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const doc = await Settings.findOneAndUpdate(
    { key: 'store' },
    {
      $setOnInsert: {
        key: 'store',
        storeName: env.STORE_NAME,
        supportEmail: env.STORE_SUPPORT_EMAIL,
        whatsappNumber: env.STORE_WHATSAPP_NUMBER,
        lowStockThreshold: 5,
        maintenanceMode: false,
      },
    },
    { upsert: true, new: true, lean: true },
  );
  if (!doc) throw new Error('Store settings could not be loaded');
  const value: StoreSettings = {
    storeName: doc.storeName,
    supportEmail: doc.supportEmail,
    supportPhone: doc.supportPhone ?? undefined,
    whatsappNumber: doc.whatsappNumber ?? '',
    lowStockThreshold: doc.lowStockThreshold,
    maintenanceMode: doc.maintenanceMode,
  };
  cache = { value, at: Date.now() };
  return value;
}

export function invalidateSettingsCache(): void {
  cache = null;
}
