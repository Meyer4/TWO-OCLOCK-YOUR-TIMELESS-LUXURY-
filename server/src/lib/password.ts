import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Password policy: at least 8 characters, containing at least one letter and one digit.
 * Returns a list of human-readable problems (empty when valid).
 */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(`Use at least ${PASSWORD_MIN_LENGTH} characters`);
  if (password.length > PASSWORD_MAX_LENGTH) problems.push(`Use at most ${PASSWORD_MAX_LENGTH} characters`);
  if (!/[A-Za-z]/.test(password)) problems.push('Include at least one letter');
  if (!/\d/.test(password)) problems.push('Include at least one number');
  return problems;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * Runs a bcrypt comparison even when the account does not exist, so response
 * timing does not reveal which emails are registered.
 */
export function burnPasswordCheck(password: string): Promise<boolean> {
  dummyHashPromise ??= hashPassword('timing-equaliser-not-a-real-password');
  return dummyHashPromise.then((hash) => bcrypt.compare(password, hash));
}
