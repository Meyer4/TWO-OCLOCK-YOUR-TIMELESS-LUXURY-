import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IAddress {
  user: Types.ObjectId;
  label?: string | undefined;
  recipientName: string;
  country: string;
  city: string;
  district: string;
  street: string;
  phone: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, maxlength: 40 },
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    country: { type: String, required: true, trim: true, maxlength: 80, default: 'Malawi' },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, required: true, trim: true, maxlength: 80 },
    street: { type: String, required: true, trim: true, maxlength: 240 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type AddressDocument = HydratedDocument<IAddress>;
export const Address = model<IAddress>('Address', addressSchema);
