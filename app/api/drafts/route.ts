import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { listPosts, movePost, removePost, reorderPosts, savePost, updatePostOrderMeta } from '@/lib/hexo';
import type { SavePostInput } from '@/types/post';

export const GET = withAuth(async (request: Request) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (path) {
    const { getPost } = await import('@/lib/hexo');
    return NextResponse.json({ draft: await getPost(path, 'draft') });
  }
  return NextResponse.json({ drafts: await listPosts('draft') });
});

export const POST = withAuth(async (request: Request) => {
  const input = await parseJson<SavePostInput>(request);
  const result = await savePost({ ...input, kind: 'draft' });
  return NextResponse.json(result);
});

export const PATCH = withAuth(async (request: Request) => {
  const input = await parseJson<{ path?: string; action: 'publish' | 'unpublish' | 'reorder' | 'order-meta'; paths?: string[]; priority?: number; sticky?: boolean | number }>(request);
  if (input.action === 'reorder') {
    if (!Array.isArray(input.paths)) return NextResponse.json({ error: 'paths are required' }, { status: 400 });
    return NextResponse.json(await reorderPosts('draft', input.paths));
  }
  if (input.action === 'order-meta') {
    if (!input.path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
    return NextResponse.json(await updatePostOrderMeta({ path: input.path, kind: 'draft', priority: input.priority, sticky: input.sticky }));
  }
  if (!input.path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
  const result = input.action === 'publish' ? await movePost(input.path, 'draft', 'post') : await movePost(input.path, 'post', 'draft');
  return NextResponse.json(result);
});

export const DELETE = withAuth(async (request: Request) => {
  const { path, sha } = await parseJson<{ path: string; sha: string }>(request);
  return NextResponse.json(await removePost(path, 'draft', sha));
});
