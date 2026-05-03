import YAML from 'yaml';
import { inflateRawSync } from 'zlib';
import { getFile, listDirectory, putFile, putFiles } from './github';
import { assertSafeRepoPath, isInsideDir, joinRepoPath, normalizeRepoPath, slugify } from './paths';
import type { GitHubFile } from '@/types/github';

export type ThemeSummary = {
  name: string;
  path: string;
  active: boolean;
  configPath?: string;
  configSha?: string;
  readmePath?: string;
};

export type ThemeFileSummary = {
  name: string;
  path: string;
  type: GitHubFile['type'];
  sha: string;
  size: number;
};

type InstallThemeInput = {
  name?: string;
  activate?: boolean;
  archiveBase64?: string;
  files?: Array<{ path: string; contentBase64: string }>;
};

const maxThemeArchiveBytes = 30 * 1024 * 1024;
const maxThemeFileCount = 1200;
const editableExtensions = new Set([
  '.css', '.ejs', '.html', '.js', '.json', '.jsx', '.less', '.md', '.njk', '.pug', '.sass', '.scss', '.styl', '.swig', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml'
]);

function readUInt16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) return offset;
  }
  throw new Error('无法识别 zip 主题包');
}

function normalizeZipEntryPath(path: string) {
  return normalizeRepoPath(path.replace(/^\/+/, '')).replace(/^\.\//, '');
}

function isEditableThemePath(path: string) {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot >= 0 && editableExtensions.has(lower.slice(dot));
}

function extractZipFiles(archiveBase64: string): Array<{ path: string; contentBase64: string }> {
  const archive = Buffer.from(archiveBase64, 'base64');
  if (archive.length > maxThemeArchiveBytes) throw new Error('主题包超过 30MB，请精简后再上传');
  const eocdOffset = findEndOfCentralDirectory(archive);
  const entryCount = readUInt16(archive, eocdOffset + 10);
  if (entryCount > maxThemeFileCount) throw new Error('主题包文件数量过多');
  const centralDirectoryOffset = readUInt32(archive, eocdOffset + 16);
  const files: Array<{ path: string; contentBase64: string }> = [];
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(archive, cursor) !== 0x02014b50) throw new Error('zip 中央目录损坏');
    const compression = readUInt16(archive, cursor + 10);
    const compressedSize = readUInt32(archive, cursor + 20);
    const uncompressedSize = readUInt32(archive, cursor + 24);
    const nameLength = readUInt16(archive, cursor + 28);
    const extraLength = readUInt16(archive, cursor + 30);
    const commentLength = readUInt16(archive, cursor + 32);
    const localHeaderOffset = readUInt32(archive, cursor + 42);
    const entryName = normalizeZipEntryPath(archive.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8'));
    cursor += 46 + nameLength + extraLength + commentLength;

    if (!entryName || entryName.endsWith('/') || entryName.startsWith('__MACOSX/') || entryName.endsWith('.DS_Store')) continue;
    assertSafeRepoPath(entryName);
    if (readUInt32(archive, localHeaderOffset) !== 0x04034b50) throw new Error(`zip 文件头损坏：${entryName}`);
    const localNameLength = readUInt16(archive, localHeaderOffset + 26);
    const localExtraLength = readUInt16(archive, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const data = archive.subarray(dataStart, dataStart + compressedSize);
    let content: Buffer;
    if (compression === 0) {
      content = data;
    } else if (compression === 8) {
      content = inflateRawSync(data);
    } else {
      throw new Error(`不支持的 zip 压缩方式：${compression} (${entryName})`);
    }
    if (content.length !== uncompressedSize) throw new Error(`解压大小校验失败：${entryName}`);
    files.push({ path: entryName, contentBase64: content.toString('base64') });
  }

  if (!files.length) throw new Error('主题包没有可安装文件');
  return files;
}

function safeThemeName(name: string) {
  return slugify(name).replace(/^-+|-+$/g, '') || `theme-${Date.now()}`;
}

function commonRoot(paths: string[]) {
  const firstParts = paths[0]?.split('/') || [];
  if (!firstParts.length) return '';
  const root = firstParts[0];
  return paths.every((path) => path.startsWith(`${root}/`)) ? root : '';
}

function stripThemeRoot(path: string, root: string) {
  return root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

async function readSiteConfig() {
  const file = await getFile('_config.yml');
  const data = (YAML.parse(file.content) || {}) as Record<string, unknown>;
  return { sha: file.sha, raw: file.content, data };
}

async function activeThemeName() {
  try {
    const site = await readSiteConfig();
    return typeof site.data.theme === 'string' ? site.data.theme : '';
  } catch {
    return '';
  }
}

async function optionalFile(path: string) {
  return getFile(path).catch((error) => {
    if (String(error).includes('404')) return null;
    throw error;
  });
}

async function hasFile(path: string) {
  return Boolean(await optionalFile(path));
}

export async function listThemes(): Promise<{ activeTheme: string; themes: ThemeSummary[] }> {
  const activeTheme = await activeThemeName();
  const entries = await listDirectory('themes').catch((error) => {
    if (String(error).includes('404')) return [];
    throw error;
  });
  const dirs = entries.filter((entry) => entry.type === 'dir');
  const themes = await Promise.all(dirs.map(async (dir) => {
    const configPath = `themes/${dir.name}/_config.yml`;
    const config = await optionalFile(configPath);
    const readmePath = await hasFile(`themes/${dir.name}/README.md`) ? `themes/${dir.name}/README.md` : undefined;
    return {
      name: dir.name,
      path: dir.path,
      active: dir.name === activeTheme,
      configPath: config ? configPath : undefined,
      configSha: config?.sha,
      readmePath
    } satisfies ThemeSummary;
  }));
  return { activeTheme, themes: themes.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)) };
}

export async function activateTheme(name: string) {
  const themeName = safeThemeName(name);
  const site = await readSiteConfig();
  site.data.theme = themeName;
  const raw = YAML.stringify(site.data, { lineWidth: 0 });
  const result = await putFile({ path: '_config.yml', content: raw.endsWith('\n') ? raw : `${raw}\n`, sha: site.sha, message: `Activate Hexo theme: ${themeName}` });
  return { theme: themeName, commit: result.commit };
}

export async function installTheme(input: InstallThemeInput) {
  const inputFiles = input.files?.length ? input.files : input.archiveBase64 ? extractZipFiles(input.archiveBase64) : [];
  if (!inputFiles.length) throw new Error('主题包没有可安装文件');
  const sourcePaths = inputFiles.map((file) => assertSafeRepoPath(file.path));
  const root = commonRoot(sourcePaths);
  const themeName = safeThemeName(input.name || root || sourcePaths[0].split('/')[0] || 'theme');
  const files = inputFiles.map((file) => {
    const sourcePath = assertSafeRepoPath(file.path);
    const relative = assertSafeRepoPath(stripThemeRoot(sourcePath, root));
    return { path: joinRepoPath('themes', themeName, relative), contentBase64: file.contentBase64 };
  });
  await putFiles({ files, message: `Install Hexo theme: ${themeName}` });
  const activation = input.activate === false ? null : await activateTheme(themeName);
  return { theme: themeName, installed: files.length, activated: Boolean(activation), commit: activation?.commit };
}

export async function listThemeFiles(theme: string, dir = ''): Promise<{ theme: string; path: string; files: ThemeFileSummary[] }> {
  const themeName = safeThemeName(theme);
  const base = joinRepoPath('themes', themeName);
  const normalizedDir = normalizeRepoPath(dir);
  const target = normalizedDir ? (normalizedDir === base || normalizedDir.startsWith(`${base}/`) ? normalizedDir : joinRepoPath(base, normalizedDir)) : base;
  if (!isInsideDir(target, base)) throw new Error('Path is outside the theme directory');
  const entries = await listDirectory(target).catch((error) => {
    if (String(error).includes('404')) return [];
    throw error;
  });
  return {
    theme: themeName,
    path: target,
    files: entries.map((entry) => ({ name: entry.name, path: entry.path, type: entry.type, sha: entry.sha, size: entry.size })).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
  };
}

export async function getThemeFile(path: string) {
  const normalized = assertSafeRepoPath(path);
  if (!isInsideDir(normalized, 'themes')) throw new Error('Path is outside the themes directory');
  if (!isEditableThemePath(normalized)) throw new Error('仅支持编辑文本主题文件，图片、字体等二进制资源请通过主题包安装。');
  const file = await getFile(normalized);
  return { path: file.path, name: file.name, sha: file.sha, size: file.size, content: file.content };
}

export async function saveThemeFile(input: { path: string; content: string; sha?: string }) {
  const normalized = assertSafeRepoPath(input.path);
  if (!isInsideDir(normalized, 'themes')) throw new Error('Path is outside the themes directory');
  if (!isEditableThemePath(normalized)) throw new Error('仅支持保存文本主题文件。');
  const result = await putFile({ path: normalized, content: input.content, sha: input.sha || undefined, message: `Update theme file: ${normalized}` });
  return { path: normalized, sha: result.content.sha, commit: result.commit };
}
