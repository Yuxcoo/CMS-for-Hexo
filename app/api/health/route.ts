import { NextResponse } from 'next/server';
import { getPublicConfigStatus } from '@/lib/config';
import { getOptionalRepoContext } from '@/lib/repo-context';

export function GET() {
  const repo = getOptionalRepoContext();
  return NextResponse.json({ ok: true, config: getPublicConfigStatus(), currentRepository: repo, time: new Date().toISOString() });
}
