import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { getSiteConfig, mergeCommonSiteFields, saveSiteConfig } from '@/lib/site-config';

export const GET = withAuth(async () => {
  return NextResponse.json({ config: await getSiteConfig() });
});

export const POST = withAuth(async (request: Request) => {
  const body = await parseJson<{ raw?: string; sha?: string; fields?: Record<string, string> }>(request);
  const raw = body.raw || (body.fields ? mergeCommonSiteFields((await getSiteConfig()).raw, body.fields) : '');
  if (!raw) return NextResponse.json({ error: 'raw config is required' }, { status: 400 });
  return NextResponse.json(await saveSiteConfig({ raw, sha: body.sha }));
});
