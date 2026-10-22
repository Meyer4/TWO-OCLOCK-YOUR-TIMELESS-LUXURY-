import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import type { Role } from '../lib/jwt.js';

export interface RefreshSession {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string | undefined;
}

export interface IUser {
  name: string;
  email: string;
  passwordHash?: string | undefined;
  phone?: string | undefined;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifyTokenHash?: string | null | undefined;
  emailVerifyExpires?: Date | null | undefined;
  passwordResetTokenHash?: string | null | undefined;
  passwordResetExpires?: Date | null | undefined;
  refreshSessions: RefreshSession[];
  points: number;
  referralCode: string;
  referredBy?: Types.ObjectId | null | undefined;
  referralRewardGranted: boolean;
  lastLoginAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new Schema<RefreshSession>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
    userAgent: { type: String, maxlength: 300 },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: ['customer', 'admin', 'super_admin'], default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshSessions: { type: [refreshSessionSchema], default: [], select: false },
    points: { type: Number, default: 0, min: 0 },
    referralCode: { type: String, required: true, unique: true, uppercase: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referralRewardGranted: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<IUser>;
export const User = model<IUser>('User', userSchema);
