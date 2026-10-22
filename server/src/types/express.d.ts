import type { Role } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { id: string; role: Role };
    }
  }
}

export {};
