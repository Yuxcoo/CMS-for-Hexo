import YAML from 'yaml';
import { gunzipSync, inflateRawSync } from 'zlib';
import { deleteFile, getFile, getFileBase64, listDirectory, putFile, putFiles } from './github';
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

export type NpmThemeSearchItem = {
  packageName: string;
  themeName: string;
  version: string;
  description?: string;
  date?: string;
  links?: {
    npm?: string;
    homepage?: string;
    repository?: string;
  };
};

const maxThemeArchiveBytes = 30 * 1024 * 1024;
const maxThemeFileCount = 1200;
const editableExtensions = new Set([
  '.css', '.ejs', '.html', '.js', '.json', '.jsx', '.less', '.md', '.njk', '.pug', '.sass', '.scss', '.styl', '.swig', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml'
]);
const themeSupportDependencies = {
  'hexo-renderer-pug': '^3.0.0',
  'hexo-renderer-stylus': '^3.0.1'
};

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

function stripNulls(value: string) {
  return value.replace(/\0.*$/, '').trim();
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

function readTarOctal(buffer: Buffer, start: number, length: number) {
  const raw = stripNulls(buffer.subarray(start, start + length).toString('utf8')).replace(/\s+$/g, '');
  return raw ? parseInt(raw, 8) : 0;
}

function extractTarFiles(archive: Buffer): Array<{ path: string; contentBase64: string }> {
  const files: Array<{ path: string; contentBase64: string }> = [];
  let offset = 0;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const name = stripNulls(header.subarray(0, 100).toString('utf8'));
    const prefix = stripNulls(header.subarray(345, 500).toString('utf8'));
    const typeFlag = stripNulls(header.subarray(156, 157).toString('utf8')) || '0';
    const size = readTarOctal(header, 124, 12);
    const fullName = normalizeZipEntryPath(prefix ? `${prefix}/${name}` : name);
    offset += 512;

    const data = archive.subarray(offset, offset + size);
    const paddedSize = Math.ceil(size / 512) * 512;
    offset += paddedSize;

    if (!fullName || fullName.endsWith('/') || typeFlag === '5') continue;
    if (typeFlag !== '0' && typeFlag !== '') continue;
    if (fullName.startsWith('__MACOSX/') || fullName.endsWith('.DS_Store')) continue;
    assertSafeRepoPath(fullName);
    files.push({ path: fullName, contentBase64: data.toString('base64') });
  }

  if (!files.length) throw new Error('npm 主题包没有可安装文件');
  return files;
}

function safeThemeName(name: string) {
  return slugify(name).replace(/^-+|-+$/g, '') || `theme-${Date.now()}`;
}

function commonRoot(paths: string[]) {
  const firstParts = paths[0]?.split('/').filter(Boolean) || [];
  if (!firstParts.length) return '';
  const shared: string[] = [];

  for (let index = 0; index < firstParts.length; index += 1) {
    const segment = firstParts[index];
    if (paths.every((path) => path.split('/').filter(Boolean)[index] === segment)) {
      shared.push(segment);
      continue;
    }
    break;
  }

  if (shared[0] === 'themes' && shared[1]) return shared.slice(0, 2).join('/');
  return shared.length === 1 ? shared[0] : '';
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

async function ensureThemeSupportPackages() {
  const current = await optionalFile('package.json');
  const parsed = JSON.parse(current?.content || '{}') as {
    dependencies?: Record<string, string>;
    [key: string]: unknown;
  };
  const nextDependencies = { ...themeSupportDependencies, ...(parsed.dependencies || {}) };
  const nextContent = `${JSON.stringify({ ...parsed, dependencies: nextDependencies }, null, 2)}\n`;
  if (current?.content === nextContent) return null;
  return putFile({
    path: 'package.json',
    content: nextContent,
    sha: current?.sha,
    message: 'Ensure Hexo theme renderer dependencies'
  });
}

async function ensureThemePackageDependency(packageName: string, version: string) {
  const current = await optionalFile('package.json');
  const parsed = JSON.parse(current?.content || '{}') as {
    dependencies?: Record<string, string>;
    [key: string]: unknown;
  };
  const dependencies = { ...(parsed.dependencies || {}), [packageName]: `^${version}` };
  const nextContent = `${JSON.stringify({ ...parsed, dependencies }, null, 2)}\n`;
  if (current?.content === nextContent) return null;
  return putFile({
    path: 'package.json',
    content: nextContent,
    sha: current?.sha,
    message: `Add Hexo theme dependency: ${packageName}@${version}`
  });
}

function themeNameFromPackageName(packageName: string) {
  const normalized = packageName.replace(/^@[^/]+\//, '').replace(/^hexo-theme-/, '');
  return safeThemeName(normalized || packageName);
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
  await ensureThemeSupportPackages();
  const activation = input.activate === false ? null : await activateTheme(themeName);
  return { theme: themeName, installed: files.length, activated: Boolean(activation), commit: activation?.commit };
}

export async function searchNpmThemes(query: string): Promise<{ items: NpmThemeSearchItem[] }> {
  const normalizedQuery = query.trim();
  const searchText = normalizedQuery ? `${normalizedQuery} hexo theme` : 'hexo theme';

  const [searchResponse, exactPackage] = await Promise.all([
    fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchText)}&size=24`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 * 30 }
    }),
    normalizedQuery && !normalizedQuery.includes('hexo-theme')
      ? fetch(`https://registry.npmjs.org/${encodeURIComponent(`hexo-theme-${normalizedQuery}`)}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 * 30 }
      }).then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json() as {
          name?: string;
          description?: string;
          'dist-tags'?: { latest?: string };
          homepage?: string;
          repository?: { url?: string } | string;
          time?: Record<string, string>;
        };
        return {
          packageName: body.name || `hexo-theme-${normalizedQuery}`,
          themeName: themeNameFromPackageName(body.name || `hexo-theme-${normalizedQuery}`),
          version: body['dist-tags']?.latest || 'unknown',
          description: body.description,
          date: body.time?.[body['dist-tags']?.latest || ''] || body.time?.modified,
          links: {
            npm: body.name ? `https://www.npmjs.com/package/${body.name}` : undefined,
            homepage: body.homepage,
            repository: typeof body.repository === 'string' ? body.repository : body.repository?.url
          }
        } satisfies NpmThemeSearchItem;
      }).catch(() => null)
      : Promise.resolve(null)
  ]);

  if (!searchResponse.ok) throw new Error('搜索 npm 主题失败');
  const result = await searchResponse.json() as {
    objects?: Array<{
      package: {
        name: string;
        version: string;
        description?: string;
        date?: string;
        links?: { npm?: string; homepage?: string; repository?: string };
      };
    }>;
  };

  const keyword = normalizedQuery.toLowerCase();
  const candidates = (result.objects || [])
    .map((entry) => entry.package)
    .filter((pkg) => pkg.name.includes('hexo-theme') || pkg.description?.toLowerCase().includes('hexo theme'))
    .map((pkg) => ({
      packageName: pkg.name,
      themeName: themeNameFromPackageName(pkg.name),
      version: pkg.version,
      description: pkg.description,
      date: pkg.date,
      links: pkg.links
    } satisfies NpmThemeSearchItem));

  const merged = exactPackage ? [exactPackage, ...candidates] : candidates;
  const deduped = merged.filter((item, index, list) => list.findIndex((entry) => entry.packageName === item.packageName) === index);
  const ranked = keyword
    ? deduped.sort((a, b) => {
      const aExact = Number(a.packageName.toLowerCase() === `hexo-theme-${keyword}` || a.themeName.toLowerCase() === keyword);
      const bExact = Number(b.packageName.toLowerCase() === `hexo-theme-${keyword}` || b.themeName.toLowerCase() === keyword);
      if (aExact !== bExact) return bExact - aExact;
      const aIncludes = Number(a.packageName.toLowerCase().includes(keyword) || a.themeName.toLowerCase().includes(keyword));
      const bIncludes = Number(b.packageName.toLowerCase().includes(keyword) || b.themeName.toLowerCase().includes(keyword));
      if (aIncludes !== bIncludes) return bIncludes - aIncludes;
      return a.packageName.localeCompare(b.packageName);
    })
    : deduped;

  return { items: ranked.slice(0, 24) };
}

export async function installNpmTheme(input: { packageName: string; version?: string; activate?: boolean }) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(input.packageName).replace('%40', '@')}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 * 30 }
  });
  if (!response.ok) throw new Error(`读取 npm 主题信息失败：${input.packageName}`);
  const metadata = await response.json() as {
    'dist-tags'?: { latest?: string };
    versions?: Record<string, { dist?: { tarball?: string }; name?: string; version?: string; hexo?: { theme?: string } }>;
  };
  const version = input.version || metadata['dist-tags']?.latest;
  if (!version) throw new Error(`无法确定 ${input.packageName} 的版本`);
  const release = metadata.versions?.[version];
  const tarball = release?.dist?.tarball;
  if (!tarball) throw new Error(`找不到 ${input.packageName}@${version} 的 tarball`);

  const archiveResponse = await fetch(tarball, { next: { revalidate: 60 * 30 } });
  if (!archiveResponse.ok) throw new Error(`下载 ${input.packageName}@${version} 失败`);
  const tgzBuffer = Buffer.from(await archiveResponse.arrayBuffer());
  const tarBuffer = gunzipSync(tgzBuffer);
  const files = extractTarFiles(tarBuffer);
  const packageRoot = commonRoot(files.map((file) => file.path));
  const preferredThemeName = release?.hexo?.theme || themeNameFromPackageName(input.packageName);
  const installResult = await installTheme({
    name: preferredThemeName,
    activate: input.activate,
    files: files.map((file) => ({
      path: stripThemeRoot(file.path, packageRoot),
      contentBase64: file.contentBase64
    }))
  });
  await ensureThemePackageDependency(input.packageName, version);
  return { ...installResult, packageName: input.packageName, version };
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

async function walkThemeFiles(path: string): Promise<Array<{ path: string; sha: string }>> {
  const entries = await listDirectory(path).catch((error) => {
    if (String(error).includes('404')) return [];
    throw error;
  });
  const files: Array<{ path: string; sha: string }> = [];
  for (const entry of entries) {
    if (entry.type === 'dir') {
      files.push(...await walkThemeFiles(entry.path));
      continue;
    }
    files.push({ path: entry.path, sha: entry.sha });
  }
  return files;
}

export async function renameTheme(name: string, nextName: string) {
  const currentName = safeThemeName(name);
  const targetName = safeThemeName(nextName);
  if (!currentName) throw new Error('缺少当前主题名');
  if (!targetName) throw new Error('缺少新主题名');
  if (currentName === targetName) return { theme: targetName, renamed: 0, active: (await activeThemeName()) === currentName };

  const sourceBase = joinRepoPath('themes', currentName);
  const targetBase = joinRepoPath('themes', targetName);
  const sourceEntries = await walkThemeFiles(sourceBase);
  if (!sourceEntries.length) throw new Error('当前主题目录为空或不存在');
  const existsTarget = await listDirectory(targetBase).then(() => true).catch((error) => {
    if (String(error).includes('404')) return false;
    throw error;
  });
  if (existsTarget) throw new Error('目标主题名称已存在，请换一个名称');

  const files = await Promise.all(sourceEntries.map(async (entry) => {
    const file = await getFileBase64(entry.path);
    const relative = entry.path.slice(sourceBase.length + 1);
    return { path: joinRepoPath(targetBase, relative), contentBase64: file.contentBase64 };
  }));

  await putFiles({ files, message: `Rename Hexo theme: ${currentName} -> ${targetName}` });
  for (const entry of sourceEntries.reverse()) {
    await deleteFile({ path: entry.path, sha: entry.sha, message: `Remove old Hexo theme path: ${entry.path}` });
  }

  const activeTheme = await activeThemeName();
  if (activeTheme === currentName) {
    await activateTheme(targetName);
  }

  return { theme: targetName, renamed: sourceEntries.length, active: activeTheme === currentName };
}

export async function removeTheme(name: string) {
  const themeName = safeThemeName(name);
  const activeTheme = await activeThemeName();
  if (themeName === activeTheme) {
    throw new Error('不能删除当前正在使用的主题，请先切换到其他主题');
  }

  const base = joinRepoPath('themes', themeName);
  const files = await walkThemeFiles(base);
  if (!files.length) throw new Error('主题不存在或已经被删除');
  for (const file of files.reverse()) {
    await deleteFile({ path: file.path, sha: file.sha, message: `Delete Hexo theme: ${themeName}` });
  }
  return { theme: themeName, deleted: files.length };
}
