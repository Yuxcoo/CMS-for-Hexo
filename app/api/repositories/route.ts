import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { chooseRepository, createHexoRepository, getViewerLogin, initializeHexoRepository, listRepositories } from '@/lib/repositories';

export const GET = withAuth(async () => {
  const [repositories, viewer] = await Promise.all([listRepositories(), getViewerLogin()]);
  return NextResponse.json({ repositories, viewerLogin: viewer.login });
});

export const POST = withAuth(async (request: Request) => {
  const body = await parseJson<{ action: 'select' | 'create' | 'initialize'; owner?: string; repo?: string; name?: string; description?: string; private?: boolean; initializeHexo?: boolean }>(request);
  if (body.action === 'select') {
    if (!body.owner || !body.repo) return NextResponse.json({ error: 'owner and repo are required' }, { status: 400 });
    return NextResponse.json({ context: await chooseRepository({ owner: body.owner, repo: body.repo }) });
  }
  if (body.action === 'create') {
    if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    return NextResponse.json(await createHexoRepository({ name: body.name, description: body.description, private: body.private, initializeHexo: body.initializeHexo }));
  }
  if (body.action === 'initialize') {
    return NextResponse.json(await initializeHexoRepository());
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
});
