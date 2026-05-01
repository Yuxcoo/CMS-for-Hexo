export function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

export function assertSafeRepoPath(path: string): string {
  const normalized = normalizeRepoPath(path);
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Unsafe repository path');
  }
  return normalized;
}

export function joinRepoPath(...parts: string[]): string {
  return assertSafeRepoPath(parts.filter(Boolean).join('/'));
}

export function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `post-${Date.now()}`;
}

export function ensureMarkdownFileName(name: string): string {
  const clean = assertSafeRepoPath(name).split('/').pop() || '';
  const base = clean.replace(/\.mdx?$/i, '');
  return `${slugify(base)}.md`;
}

export function isInsideDir(filePath: string, dir: string): boolean {
  const normalizedFile = normalizeRepoPath(filePath);
  const normalizedDir = normalizeRepoPath(dir).replace(/\/$/, '');
  return normalizedFile === normalizedDir || normalizedFile.startsWith(`${normalizedDir}/`);
}
