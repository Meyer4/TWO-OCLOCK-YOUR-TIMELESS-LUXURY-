import { Types } from 'mongoose';
import { User } from '../models/index.js';
import { REFERRAL_FRIEND_BONUS_POINTS, REFERRER_BONUS_POINTS } from '../config/constants.js';
import { sendEmailNotification } from './notifications.js';

/**
 * Grants referral rewards exactly once, on the referred friend's first paid order.
 * The conditional update on `referralRewardGranted` makes this safe under retries.
 */
export async function grantReferralRewardsOnFirstPaidOrder(userId: Types.ObjectId | string): Promise<void> {
  const friend = await User.findOneAndUpdate(
    { _id: userId, referralRewardGranted: false, referredBy: { $ne: null } },
    { $set: { referralRewardGranted: true }, $inc: { points: REFERRAL_FRIEND_BONUS_POINTS } },
    { new: true, lean: true },
  );
  if (!friend?.referredBy) return;

  const referrer = await User.findByIdAndUpdate(
    friend.referredBy,
    { $inc: { points: REFERRER_BONUS_POINTS } },
    { new: true, lean: true },
  );
  if (referrer) {
    await sendEmailNotification({
      to: referrer.email,
      type: 'referral_reward',
      userId: referrer._id,
      email: {
        subject: `You earned ${REFERRER_BONUS_POINTS} loyalty points`,
        text: `Thanks for referring a friend. ${REFERRER_BONUS_POINTS} points have been added to your account.`,
        html: `<p>Thanks for referring a friend. <strong>${REFERRER_BONUS_POINTS} points</strong> have been added to your account.</p>`,
      },
    });
  }
}

/** Points reversal that never drops a balance below zero. */
export async function reducePointsFloor(userId: Types.ObjectId | string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await User.updateOne({ _id: userId }, [
    { $set: { points: { $max: [0, { $subtract: ['$points', amount] }] } } },
  ]);
}
