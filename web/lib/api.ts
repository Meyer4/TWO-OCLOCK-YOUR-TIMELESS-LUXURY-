/**
 * Browser API client. All calls go to /api on this origin (proxied to the API by next.config.ts).
 * - Sends the CSRF token from the `tl_csrf` cookie on state-changing requests.
 * - On a 401 it transparently refreshes the session once, then retries.
 */

import { DEMO } from '@/lib/demo/mode';
import { demoRequest, DemoError } from '@/lib/demo/handler';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level messages from the API (422 responses), keyed by field name. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (this.details && typeof this.details === 'object') {
      for (const [key, value] of Object.entries(this.details as Record<string, unknown>)) {
        if (Array.isArray(value) && value.length) out[key] = String(value[0]);
      }
    }
    return out;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : undefined;
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
let refreshing: Promise<boolean> | null = null;

async function ensureCsrfCookie(): Promise<string> {
  let token = readCookie('tl_csrf');
  if (!token) {
    await fetch('/api/health', { credentials: 'include' }).catch(() => undefined);
    token = readCookie('tl_csrf');
  }
  return token ?? '';
}

async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const csrf = await ensureCsrfCookie();
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': csrf },
    });
    return res.ok;
  })().finally(() => {
    setTimeout(() => {
      refreshing = null;
    }, 0);
  });
  return refreshing;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the automatic refresh-and-retry (used for auth endpoints themselves). */
  noRefresh?: boolean;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  if (DEMO) {
    // Static demo build: answer from the bundled seed catalogue (no network call).
    try {
      return (await demoRequest(path, { method: options.method })) as T;
    } catch (err) {
      if (err instanceof DemoError) throw new ApiError(err.status, err.code, err.message);
      throw err;
    }
  }
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (!SAFE.has(method)) headers.set('x-csrf-token', await ensureCsrfCookie());

  const send = () =>
    fetch(`/api${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  let res = await send();
  const authFlow = /^\/auth\/(login|register|refresh|logout|forgot-password|reset-password|verify-email)/.test(path);
  if (res.status === 401 && !options.noRefresh && !authFlow) {
    const ok = await refreshSession();
    if (ok) res = await send();
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? 'Something went wrong. Please try again.', err?.details);
  }
  return data as T;
}

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null | string[]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v));
    else search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}
