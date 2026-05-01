import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { listPosts, movePost, removePost, savePost } from '@/lib/hexo';
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
  const { path, action } = await parseJson<{ path: string; action: 'publish' | 'unpublish' }>(request);
  const result = action === 'publish' ? await movePost(path, 'draft', 'post') : await movePost(path, 'post', 'draft');
  return NextResponse.json(result);
});

export const DELETE = withAuth(async (request: Request) => {
  const { path, sha } = await parseJson<{ path: string; sha: string }>(request);
  return NextResponse.json(await removePost(path, 'draft', sha));
});
