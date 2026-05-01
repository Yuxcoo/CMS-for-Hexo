import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { listPosts, removePost, savePost } from '@/lib/hexo';
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

export const DELETE = withAuth(async (request: Request) => {
  const { path, sha } = await parseJson<{ path: string; sha: string }>(request);
  const result = await removePost(path, 'post', sha);
  return NextResponse.json(result);
});
