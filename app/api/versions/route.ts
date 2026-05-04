import { NextResponse } from 'next/server';
import { parseJson } from '@/lib/api';
import { withAuth } from '@/lib/api';
import { getVersionReport, upgradeDependencyVersion } from '@/lib/versions';

export const GET = withAuth(async () => {
  return NextResponse.json({ report: await getVersionReport() });
});

export const POST = withAuth(async (request: Request) => {
  const body = await parseJson<{ action: 'upgrade'; name?: string; source?: 'dependencies' | 'devDependencies' | 'theme'; version?: string }>(request);
  if (body.action !== 'upgrade' || !body.name || !body.source) {
    return NextResponse.json({ error: 'name, source and action=upgrade are required' }, { status: 400 });
  }
  return NextResponse.json(await upgradeDependencyVersion({ name: body.name, source: body.source, version: body.version }));
});
