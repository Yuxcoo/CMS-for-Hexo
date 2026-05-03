import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { getPage, listPages, reorderPages, savePage, updatePagePriority } from '@/lib/pages';

export const GET = withAuth(async (request: Request) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (path) return NextResponse.json({ page: await getPage(path) });
  return NextResponse.json({ pages: await listPages() });
});

export const POST = withAuth(async (request: Request) => {
  const input = await parseJson<{ title: string; slug?: string; body?: string; menuLabel?: string; path?: string; sha?: string; priority?: number }>(request);
  return NextResponse.json(await savePage(input));
});

export const PATCH = withAuth(async (request: Request) => {
  const input = await parseJson<{ action: 'reorder' | 'priority'; paths?: string[]; path?: string; priority?: number }>(request);
  if (input.action === 'reorder') {
    if (!Array.isArray(input.paths)) return NextResponse.json({ error: 'paths are required' }, { status: 400 });
    return NextResponse.json(await reorderPages(input.paths));
  }
  if (input.action === 'priority') {
    if (!input.path || typeof input.priority !== 'number') return NextResponse.json({ error: 'path and priority are required' }, { status: 400 });
    return NextResponse.json(await updatePagePriority(input.path, input.priority));
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
});
