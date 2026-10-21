import type { UserDocument } from '../models/User.js';

/** Safe public projection of a user. Never includes hashes, tokens or sessions. */
export function publicUser(user: Pick<UserDocument, '_id' | 'name' | 'email' | 'phone' | 'role' | 'emailVerified' | 'points' | 'referralCode' | 'createdAt'>) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
    points: user.points,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
  };
}
