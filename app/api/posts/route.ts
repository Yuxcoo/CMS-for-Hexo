import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { listPosts, removePost, reorderPosts, savePost, updatePostOrderMeta } from '@/lib/hexo';
import type { SavePostInput } from '@/types/post';

export const GET = withAuth(async () => {
  const posts = await listPosts('post');
  return NextResponse.json({ posts });
});

export const POST = withAuth(async (request: Request) => {
  const input = await parseJson<SavePostInput>(request);
  const result = await savePost({ ...input, kind: 'post' });
  return NextResponse.json(result);
});

export const PATCH = withAuth(async (request: Request) => {
  const input = await parseJson<{ action: 'reorder' | 'order-meta'; paths?: string[]; path?: string; priority?: number; sticky?: boolean | number }>(request);
  if (input.action === 'reorder') {
    if (!Array.isArray(input.paths)) return NextResponse.json({ error: 'paths are required' }, { status: 400 });
    return NextResponse.json(await reorderPosts('post', input.paths));
  }
  if (input.action === 'order-meta') {
    if (!input.path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
    return NextResponse.json(await updatePostOrderMeta({ path: input.path, kind: 'post', priority: input.priority, sticky: input.sticky }));
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
});

export const DELETE = withAuth(async (request: Request) => {
  const { path, sha } = await parseJson<{ path: string; sha: string }>(request);
  const result = await removePost(path, 'post', sha);
  return NextResponse.json(result);
});
