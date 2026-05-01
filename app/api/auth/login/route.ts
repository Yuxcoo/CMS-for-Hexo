import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { parseJson } from '@/lib/api';
import { setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  const body = await parseJson<{ password?: string }>(request);
  if (!body.password || body.password !== getConfig().ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  setSessionCookie();
  return NextResponse.json({ ok: true });
}
