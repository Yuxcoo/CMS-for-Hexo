import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { getThemeConfig, saveThemeConfig } from '@/lib/theme-config';

export const GET = withAuth(async () => {
  return NextResponse.json({ config: await getThemeConfig() });
});

export const POST = withAuth(async (request: Request) => {
  const body = await parseJson<{ path?: string; raw?: string; sha?: string }>(request);
  if (!body.path || !body.raw) return NextResponse.json({ error: 'path and raw are required' }, { status: 400 });
  return NextResponse.json(await saveThemeConfig({ path: body.path, raw: body.raw, sha: body.sha }));
});
