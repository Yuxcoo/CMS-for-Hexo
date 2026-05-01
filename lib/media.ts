import { getConfig } from './config';
import { deleteFile, getFile, listDirectory, putFile } from './github';
import { assertSafeRepoPath, isInsideDir, joinRepoPath, normalizeRepoPath, slugify } from './paths';
import { getRepoContext } from './repo-context';

export type MediaItem = {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  previewUrl: string;
  markdown: string;
};

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);

function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

function toPublicImagePath(path: string): string {
  const imagesDir = normalizeRepoPath(getConfig().HEXO_IMAGES_DIR).replace(/\/$/, '');
  const normalized = normalizeRepoPath(path);
  const relative = normalized.startsWith(`${imagesDir}/`) ? normalized.slice(imagesDir.length + 1) : normalized;
  return `/images/${relative}`;
}

function toRawImageUrl(path: string): string {
  const config = getConfig();
  const context = getRepoContext();
  return `https://raw.githubusercontent.com/${context.owner}/${context.repo}/${config.GITHUB_BRANCH}/${normalizeRepoPath(path)}`;
}

async function walkMediaDir(path: string, depth = 0): Promise<MediaItem[]> {
  if (depth > 4) return [];
  const entries = await listDirectory(path).catch(() => []);
  const items = await Promise.all(
    entries.map(async (entry) => {
      if (entry.type === 'dir') return walkMediaDir(entry.path, depth + 1);
      if (!imageExtensions.has(extensionOf(entry.name))) return [];
      const url = toPublicImagePath(entry.path);
      return [
        {
          name: entry.name,
          path: entry.path,
          sha: entry.sha,
          size: entry.size,
          url,
          previewUrl: toRawImageUrl(entry.path),
          markdown: `![${entry.name}](${url})`
        }
      ];
    })
  );
  return items.flat().sort((a, b) => b.path.localeCompare(a.path));
}

export async function listMedia(): Promise<MediaItem[]> {
  return walkMediaDir(getConfig().HEXO_IMAGES_DIR);
}

export async function uploadMedia(params: { name: string; contentBase64: string; mimeType?: string }) {
  const ext = extensionOf(params.name);
  if (!imageExtensions.has(ext)) throw new Error('Unsupported image type');
  const now = new Date();
  const folder = joinRepoPath(getConfig().HEXO_IMAGES_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  const baseName = slugify(params.name.replace(/\.[^.]+$/, ''));
  const path = joinRepoPath(folder, `${baseName}-${now.getTime()}${ext}`);
  const result = await putFile({
    path,
    contentBase64: params.contentBase64,
    message: `Upload media: ${params.name}`
  });
  const url = toPublicImagePath(path);
  return { path, sha: result.content.sha, url, previewUrl: toRawImageUrl(path), markdown: `![${params.name}](${url})`, commit: result.commit };
}

export async function removeMedia(path: string, sha?: string) {
  const normalized = assertSafeRepoPath(path);
  if (!isInsideDir(normalized, getConfig().HEXO_IMAGES_DIR)) throw new Error('Path is outside media directory');
  const file = sha ? { sha } : await getFile(normalized);
  return deleteFile({ path: normalized, sha: file.sha, message: `Delete media: ${normalized.split('/').pop()}` });
}
