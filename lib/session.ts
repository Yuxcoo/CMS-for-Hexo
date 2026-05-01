import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { getAuthConfig } from './config';

const COOKIE_NAME = 'cms_for_hexo_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

function sign(value: string): string {
  return createHmac('sha256', getAuthConfig().SESSION_SECRET).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionValue(): string {
  const payload = JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE });
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionValue(value?: string): boolean {
  if (!value) return false;
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  return verifySessionValue(cookies().get(COOKIE_NAME)?.value);
}

export function setSessionCookie(): void {
  cookies().set(COOKIE_NAME, createSessionValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export function requireAuth(): void {
  if (!isAuthenticated()) {
    throw new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  }
}
