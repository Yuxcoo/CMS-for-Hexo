import matter from 'gray-matter';
import YAML from 'yaml';
import { getConfig } from './config';
import { deleteFile, getFile, listDirectory, putFile } from './github';
import { ensureMarkdownFileName, isInsideDir, joinRepoPath, normalizeRepoPath } from './paths';
import type { PostContent, PostKind, PostMeta, PostSummary, SavePostInput } from '@/types/post';

function dirForKind(kind: PostKind): string {
  const config = getConfig();
  return kind === 'post' ? config.HEXO_POSTS_DIR : config.HEXO_DRAFTS_DIR;
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

export function parseMarkdown(raw: string): { meta: PostMeta; body: string } {
  const parsed = matter(raw);
  const data = parsed.data || {};
  return {
    meta: {
      ...data,
      title: String(data.title || 'Untitled'),
      date: data.date ? String(data.date) : undefined,
      updated: data.updated ? String(data.updated) : undefined,
      tags: normalizeArray(data.tags),
      categories: normalizeArray(data.categories)
    },
    body: parsed.content.trimStart()
  };
}

export function stringifyMarkdown(meta: PostMeta, body: string): string {
  const frontMatter = YAML.stringify(meta, { lineWidth: 0 }).trim();
  return `---\n${frontMatter}\n---\n\n${body.trimStart()}`;
}

export async function listPosts(kind: PostKind): Promise<PostSummary[]> {
  const dir = dirForKind(kind);
  const files = await listDirectory(dir).catch((error) => {
    if (String(error).includes('404')) return [];
    throw error;
  });
  const markdownFiles = files.filter((file) => file.type === 'file' && /\.mdx?$/i.test(file.name));
  const summaries = await Promise.all(
    markdownFiles.map(async (file) => {
      const content = await getFile(file.path);
      const parsed = parseMarkdown(content.content);
      return {
        path: file.path,
        name: file.name,
        sha: file.sha,
        kind,
        meta: parsed.meta,
        size: file.size
      } satisfies PostSummary;
    })
  );
  return summaries.sort((a, b) => String(b.meta.date || '').localeCompare(String(a.meta.date || '')));
}

export async function getPost(path: string, kind: PostKind): Promise<PostContent> {
  const normalized = normalizeRepoPath(path);
  if (!isInsideDir(normalized, dirForKind(kind))) throw new Error('Path is outside the configured Hexo content directory');
  const file = await getFile(normalized);
  const parsed = parseMarkdown(file.content);
  return { path: file.path, name: file.name, sha: file.sha, kind, meta: parsed.meta, body: parsed.body, raw: file.content, size: file.size };
}

export function buildPostPath(kind: PostKind, requestedPath: string | undefined, title: string): string {
  if (requestedPath) {
    const normalized = normalizeRepoPath(requestedPath);
    if (!isInsideDir(normalized, dirForKind(kind))) throw new Error('Path is outside the configured Hexo content directory');
    return normalized.replace(/\.mdx?$/i, '.md');
  }
  return joinRepoPath(dirForKind(kind), ensureMarkdownFileName(title));
}

export async function savePost(input: SavePostInput) {
  const path = buildPostPath(input.kind, input.path, input.meta.title);
  const content = stringifyMarkdown(input.meta, input.body);
  const message = input.message || `${input.sha ? 'Update' : 'Create'} ${input.kind}: ${input.meta.title}`;
  const oldPath = input.originalPath ? normalizeRepoPath(input.originalPath) : undefined;
  const isRename = Boolean(oldPath && oldPath !== path);
  const result = await putFile({ path, content, message, sha: isRename ? undefined : input.sha });
  if (oldPath && isRename && input.sha) {
    await deleteFile({ path: oldPath, sha: input.sha, message: `Remove old path for ${input.meta.title}` });
  }
  return { path, sha: result.content.sha, commit: result.commit };
}

export async function removePost(path: string, kind: PostKind, sha: string) {
  if (!isInsideDir(path, dirForKind(kind))) throw new Error('Path is outside the configured Hexo content directory');
  return deleteFile({ path, sha, message: `Delete ${kind}: ${path.split('/').pop()}` });
}

export async function movePost(path: string, from: PostKind, to: PostKind) {
  const post = await getPost(path, from);
  const targetPath = joinRepoPath(dirForKind(to), post.name);
  const meta = to === 'post' && !post.meta.date ? { ...post.meta, date: new Date().toISOString() } : post.meta;
  const saved = await putFile({
    path: targetPath,
    content: stringifyMarkdown(meta, post.body),
    message: `${from === 'draft' ? 'Publish draft' : 'Move post to draft'}: ${post.meta.title}`
  });
  await deleteFile({ path: post.path, sha: post.sha, message: `Remove ${from}: ${post.meta.title}` });
  return { path: targetPath, sha: saved.content.sha, commit: saved.commit };
}
