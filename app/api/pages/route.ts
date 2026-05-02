import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { getPage, listPages, savePage } from '@/lib/pages';

export const GET = withAuth(async (request: Request) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (path) return NextResponse.json({ page: await getPage(path) });
  return NextResponse.json({ pages: await listPages() });
});

export const POST = withAuth(async (request: Request) => {
  const input = await parseJson<{ title: string; slug?: string; body?: string; menuLabel?: string; path?: string; sha?: string }>(request);
  return NextResponse.json(await savePage(input));
});
