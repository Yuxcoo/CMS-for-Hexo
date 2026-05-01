import { NextResponse } from 'next/server';
import { getAuthConfig } from '@/lib/config';
import { parseJson } from '@/lib/api';
import { setSessionCookie } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await parseJson<{ password?: string }>(request);
    const config = getAuthConfig();
    if (!body.password || body.password !== config.ADMIN_PASSWORD) {
      return NextResponse.json({ error: '密码不正确' }, { status: 401 });
    }
    setSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '登录配置错误' }, { status: 500 });
  }
}
