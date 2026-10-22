import { Schema, model, type HydratedDocument } from 'mongoose';

export interface ISettings {
  key: 'store';
  storeName: string;
  supportEmail: string;
  supportPhone?: string | undefined;
  whatsappNumber?: string | undefined;
  lowStockThreshold: number;
  maintenanceMode: boolean;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: 'store', unique: true, immutable: true },
    storeName: { type: String, default: "Timeless Luxury Two O'Clock" },
    supportEmail: { type: String, default: 'support@example.com' },
    supportPhone: String,
    whatsappNumber: String,
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export type SettingsDocument = HydratedDocument<ISettings>;
export const Settings = model<ISettings>('Settings', settingsSchema);
