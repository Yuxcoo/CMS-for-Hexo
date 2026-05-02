import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { createPage } from '@/lib/pages';

export const POST = withAuth(async (request: Request) => {
  const input = await parseJson<{ title: string; slug?: string; body?: string; menuLabel?: string }>(request);
  return NextResponse.json(await createPage(input));
});
