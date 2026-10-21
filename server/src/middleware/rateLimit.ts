import rateLimit from 'express-rate-limit';

const MINUTE = 60 * 1000;

function limiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message } },
  });
}

export const apiLimiter = limiter(MINUTE, 300, 'Too many requests. Please slow down.');
export const loginLimiter = limiter(15 * MINUTE, 10, 'Too many sign-in attempts. Try again in 15 minutes.');
export const registerLimiter = limiter(60 * MINUTE, 10, 'Too many accounts created from this network. Try again later.');
export const passwordResetLimiter = limiter(60 * MINUTE, 5, 'Too many password reset requests. Try again later.');
export const checkoutLimiter = limiter(10 * MINUTE, 20, 'Too many checkout attempts. Please wait a few minutes.');
export const paymentLimiter = limiter(10 * MINUTE, 30, 'Too many payment requests. Please wait a few minutes.');
export const contactLimiter = limiter(60 * MINUTE, 10, 'Too many messages sent. Please try again later.');
