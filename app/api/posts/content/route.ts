import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getPost } from '@/lib/hexo';

export const GET = withAuth(async (request: Request) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
  const post = await getPost(path, 'post');
  return NextResponse.json({ post });
});
