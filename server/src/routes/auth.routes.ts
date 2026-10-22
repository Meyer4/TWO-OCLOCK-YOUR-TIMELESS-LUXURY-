import { Router, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Address, User, type UserDocument } from '../models/index.js';
import { ACCESS_COOKIE, requireAuth } from '../middleware/authenticate.js';
import { loginLimiter, passwordResetLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { env, isProd } from '../config/env.js';
import { MAX_ADDRESSES_PER_USER } from '../config/constants.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../lib/errors.js';
import { randomToken, sha256Hex } from '../lib/crypto.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { passwordResetEmail, welcomeEmail } from '../lib/emailTemplates.js';
import { sendEmailNotification } from '../services/notifications.js';
import { publicUser } from '../services/serialize.js';
import {
  addressPatchSchema,
  addressSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/index.js';
import { idParam } from '../validators/common.js';
import { z } from 'zod';

export const REFRESH_COOKIE = 'tl_refresh';
const ACCESS_MS = env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
const REFRESH_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 10;

const router = Router();

function cookieBase() {
  return { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/' };
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, cookieBase());
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase(), path: '/api/auth' });
}

/** Creates a refresh session (stored hashed) and sets both auth cookies. */
async function startSession(res: Response, user: UserDocument, userAgent?: string): Promise<void> {
  const jti = randomToken(16);
  const expiresAt = new Date(Date.now() + REFRESH_MS);
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshSessions: {
          $each: [{ tokenHash: sha256Hex(jti), expiresAt, createdAt: new Date(), userAgent: userAgent?.slice(0, 300) }],
          $slice: -MAX_SESSIONS,
        },
      },
      $set: { lastLoginAt: new Date() },
    },
  );
  const access = signAccessToken({ sub: String(user._id), role: user.role });
  const refresh = signRefreshToken({ sub: String(user._id), jti });
  res.cookie(ACCESS_COOKIE, access, { ...cookieBase(), maxAge: ACCESS_MS });
  res.cookie(REFRESH_COOKIE, refresh, { ...cookieBase(), path: '/api/auth', maxAge: REFRESH_MS });
}

async function uniqueReferralCode(): Promise<string> {
  for (;;) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    if (!(await User.exists({ referralCode: code }))) return code;
  }
}

router.post('/register', registerLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (await User.exists({ email: data.email })) {
    throw conflict('An account with this email already exists. Try signing in.');
  }

  let referredBy = null;
  if (data.referralCode) {
    const referrer = await User.findOne({ referralCode: data.referralCode }).select('_id').lean();
    referredBy = referrer?._id ?? null; // invalid codes are ignored rather than blocking sign-up
  }

  const verifyToken = randomToken(32);
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    phone: data.phone,
    referralCode: await uniqueReferralCode(),
    referredBy,
    emailVerifyTokenHash: sha256Hex(verifyToken),
    emailVerifyExpires: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });

  await startSession(res, user, req.get('user-agent'));
  void sendEmailNotification({
    to: user.email,
    type: 'welcome',
    userId: user._id,
    email: welcomeEmail(user.name, `${env.CLIENT_ORIGIN.replace(/\/$/, '')}/verify-email?token=${verifyToken}`),
  });
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', loginLimiter, async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    await burnPasswordCheck(data.password);
    throw unauthorized('Incorrect email or password');
  }
  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) throw unauthorized('Incorrect email or password');
  if (!user.isActive) throw forbidden('This account has been disabled. Contact support.');

  await startSession(res, user, req.get('user-agent'));
  res.json({ user: publicUser(user) });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (typeof token !== 'string') throw unauthorized();
  const { sub, jti } = verifyRefreshToken(token);
  const tokenHash = sha256Hex(jti);

  const user = await User.findById(sub).select('+refreshSessions');
  if (!user || !user.isActive) {
    clearAuthCookies(res);
    throw unauthorized();
  }
  const session = user.refreshSessions.find((s) => s.tokenHash === tokenHash);
  if (!session) {
    // A refresh token that was already rotated is being replayed: revoke every session.
    await User.updateOne({ _id: user._id }, { $set: { refreshSessions: [] } });
    clearAuthCookies(res);
    throw unauthorized('Your session was revoked for security. Please sign in again.');
  }
  if (session.expiresAt < new Date()) {
    clearAuthCookies(res);
    throw unauthorized('Session expired. Please sign in again.');
  }

  await User.updateOne({ _id: user._id }, { $pull: { refreshSessions: { tokenHash } } });
  await startSession(res, user, req.get('user-agent'));
  res.json({ user: publicUser(user) });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (typeof token === 'string') {
    try {
      const { sub, jti } = verifyRefreshToken(token);
      await User.updateOne({ _id: sub }, { $pull: { refreshSessions: { tokenHash: sha256Hex(jti) } } });
    } catch {
      // Expired or invalid tokens still get cleared below.
    }
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.post('/verify-email', async (req, res) => {
  const { token } = z.object({ token: z.string().min(32).max(200) }).parse(req.body);
  const user = await User.findOne({
    emailVerifyTokenHash: sha256Hex(token),
    emailVerifyExpires: { $gt: new Date() },
  }).select('+emailVerifyTokenHash');
  if (!user) throw badRequest('This verification link is invalid or has expired');
  await User.updateOne(
    { _id: user._id },
    { $set: { emailVerified: true }, $unset: { emailVerifyTokenHash: 1, emailVerifyExpires: 1 } },
  );
  res.json({ ok: true });
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email }).select('name email');
  if (user) {
    const token = randomToken(32);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: sha256Hex(token),
          passwordResetExpires: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
        },
      },
    );
    void sendEmailNotification({
      to: user.email,
      type: 'password_reset',
      userId: user._id,
      email: passwordResetEmail(
        user.name,
        `${env.CLIENT_ORIGIN.replace(/\/$/, '')}/reset-password?token=${token}`,
        env.PASSWORD_RESET_TTL_MINUTES,
      ),
    });
  }
  // Same response whether or not the account exists, to prevent account enumeration.
  res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);
  const user = await User.findOne({
    passwordResetTokenHash: sha256Hex(data.token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash');
  if (!user) throw badRequest('This reset link is invalid or has expired. Request a new one.');

  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash: await hashPassword(data.password), refreshSessions: [] },
      $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
    },
  );
  res.json({ message: 'Your password has been updated. Please sign in.' });
});

// ---- Authenticated routes ----
router.use(requireAuth);

async function currentUser(id: string): Promise<UserDocument> {
  const user = await User.findById(id);
  if (!user || !user.isActive) throw unauthorized();
  return user;
}

router.get('/me', async (req, res) => {
  const user = await currentUser(req.auth!.id);
  res.json({ user: publicUser(user) });
});

router.patch('/me', async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = await currentUser(req.auth!.id);
  if (data.name !== undefined) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  await user.save();
  res.json({ user: publicUser(user) });
});

router.post('/change-password', async (req, res) => {
  const data = changePasswordSchema.parse(req.body);
  const user = await User.findById(req.auth!.id).select('+passwordHash');
  if (!user?.passwordHash) throw unauthorized();
  if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
    throw badRequest('Your current password is incorrect', { currentPassword: ['Incorrect password'] });
  }
  user.passwordHash = await hashPassword(data.newPassword);
  await user.save();
  // Sign out every other device; this one gets a fresh session below.
  await User.updateOne({ _id: user._id }, { $set: { refreshSessions: [] } });
  await startSession(res, user, req.get('user-agent'));
  res.json({ message: 'Password changed.' });
});

router.get('/referral', async (req, res) => {
  const user = await currentUser(req.auth!.id);
  const [invited, rewarded] = await Promise.all([
    User.countDocuments({ referredBy: user._id }),
    User.countDocuments({ referredBy: user._id, referralRewardGranted: true }),
  ]);
  res.json({ code: user.referralCode, invited, rewarded, points: user.points });
});

// ---- Addresses (address book) ----
router.get('/addresses', async (req, res) => {
  const items = await Address.find({ user: req.auth!.id }).sort({ isDefault: -1, createdAt: -1 }).lean();
  res.json({ items });
});

router.post('/addresses', async (req, res) => {
  const data = addressSchema.parse(req.body);
  const count = await Address.countDocuments({ user: req.auth!.id });
  if (count >= MAX_ADDRESSES_PER_USER) throw badRequest(`You can save up to ${MAX_ADDRESSES_PER_USER} addresses`);
  const makeDefault = data.isDefault === true || count === 0;
  if (makeDefault) await Address.updateMany({ user: req.auth!.id }, { $set: { isDefault: false } });
  const address = await Address.create({ ...data, user: req.auth!.id, isDefault: makeDefault });
  res.status(201).json({ item: address });
});

router.patch('/addresses/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = addressPatchSchema.parse(req.body);
  if (data.isDefault) await Address.updateMany({ user: req.auth!.id }, { $set: { isDefault: false } });
  const address = await Address.findOneAndUpdate({ _id: id, user: req.auth!.id }, { $set: data }, { new: true });
  if (!address) throw notFound('Address not found');
  res.json({ item: address });
});

router.delete('/addresses/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const removed = await Address.findOneAndDelete({ _id: id, user: req.auth!.id });
  if (!removed) throw notFound('Address not found');
  if (removed.isDefault) {
    const next = await Address.findOne({ user: req.auth!.id }).sort({ createdAt: -1 });
    if (next) await Address.updateOne({ _id: next._id }, { $set: { isDefault: true } });
  }
  res.json({ ok: true });
});

export default router;
