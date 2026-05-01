import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { listMedia, removeMedia, uploadMedia } from '@/lib/media';

export const GET = withAuth(async () => {
  return NextResponse.json({ media: await listMedia() });
});

export const POST = withAuth(async (request: Request) => {
  const input = await parseJson<{ name: string; contentBase64: string; mimeType?: string }>(request);
  return NextResponse.json(await uploadMedia(input));
});

export const DELETE = withAuth(async (request: Request) => {
  const { path, sha } = await parseJson<{ path: string; sha?: string }>(request);
  return NextResponse.json(await removeMedia(path, sha));
});
