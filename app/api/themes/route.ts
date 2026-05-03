import { NextResponse } from 'next/server';
import { parseJson, withAuth } from '@/lib/api';
import { activateTheme, getThemeFile, installTheme, listThemeFiles, listThemes, saveThemeFile } from '@/lib/themes';

export const GET = withAuth(async (request: Request) => {
  const url = new URL(request.url);
  const theme = url.searchParams.get('theme');
  const filePath = url.searchParams.get('file');
  const dir = url.searchParams.get('dir') || '';
  if (filePath) return NextResponse.json({ file: await getThemeFile(filePath) });
  if (theme) return NextResponse.json(await listThemeFiles(theme, dir));
  return NextResponse.json(await listThemes());
});

export const POST = withAuth(async (request: Request) => {
  const body = await parseJson<{ action: 'install' | 'activate' | 'save-file'; name?: string; activate?: boolean; archiveBase64?: string; path?: string; content?: string; sha?: string }>(request);
  if (body.action === 'install') {
    if (!body.archiveBase64) return NextResponse.json({ error: 'archiveBase64 is required' }, { status: 400 });
    return NextResponse.json(await installTheme({ name: body.name, activate: body.activate, archiveBase64: body.archiveBase64 }));
  }
  if (body.action === 'activate') {
    if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    return NextResponse.json(await activateTheme(body.name));
  }
  if (body.action === 'save-file') {
    if (!body.path || typeof body.content !== 'string') return NextResponse.json({ error: 'path and content are required' }, { status: 400 });
    return NextResponse.json(await saveThemeFile({ path: body.path, content: body.content, sha: body.sha }));
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
});
