import YAML from 'yaml';
import { getFile, listDirectory, putFile } from './github';
import { normalizeRepoPath, slugify } from './paths';
import { parseMarkdown, stringifyMarkdown } from './hexo';

type SavePageInput = {
  title: string;
  slug?: string;
  body?: string;
  menuLabel?: string;
  path?: string;
  sha?: string;
  priority?: number;
};

export type PageSummary = {
  title: string;
  slug: string;
  path: string;
  url: string;
  sha: string;
  priority?: number;
};

function pagePathFromSlug(slug: string) {
  return `source/${slugify(slug)}/index.md`;
}

function slugFromPath(path: string) {
  const normalized = normalizeRepoPath(path);
  return normalized.replace(/^source\//, '').replace(/\/index\.md$/i, '');
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

async function getSiteConfig() {
  try {
    const file = await getFile('_config.yml');
    return { sha: file.sha, raw: file.content, data: (YAML.parse(file.content) || {}) as Record<string, unknown> };
  } catch (error) {
    if (String(error).includes('404')) {
      throw new Error('当前仓库没有找到 _config.yml。请先在“仓库”页补全当前仓库，或确认已连接 Hexo 仓库。');
    }
    throw error;
  }
}

function updateThemeMenu(raw: string, label: string, url: string): string {
  const parsed = (YAML.parse(raw) || {}) as Record<string, unknown>;
  const themeConfig = parsed.theme_config && typeof parsed.theme_config === 'object' && !Array.isArray(parsed.theme_config)
    ? parsed.theme_config as Record<string, unknown>
    : {};
  const menu = themeConfig.menu && typeof themeConfig.menu === 'object' && !Array.isArray(themeConfig.menu)
    ? themeConfig.menu as Record<string, unknown>
    : {};
  const nextMenu = Object.fromEntries(Object.entries(menu).filter(([, value]) => value !== url));
  parsed.theme_config = { ...themeConfig, menu: { ...nextMenu, [label]: url } };
  return YAML.stringify(parsed, { lineWidth: 0 });
}

function updateThemeMenuOrder(raw: string, pages: Array<{ title: string; url: string }>): string {
  const parsed = (YAML.parse(raw) || {}) as Record<string, unknown>;
  const themeConfig = parsed.theme_config && typeof parsed.theme_config === 'object' && !Array.isArray(parsed.theme_config)
    ? parsed.theme_config as Record<string, unknown>
    : {};
  const menu = themeConfig.menu && typeof themeConfig.menu === 'object' && !Array.isArray(themeConfig.menu)
    ? themeConfig.menu as Record<string, unknown>
    : {};
  const orderedUrls = new Set(pages.map((page) => page.url));
  const orderedMenu = Object.fromEntries(pages.map((page) => [page.title, page.url]));
  const remainingMenu = Object.fromEntries(Object.entries(menu).filter(([, value]) => !orderedUrls.has(String(value))));
  parsed.theme_config = { ...themeConfig, menu: { ...orderedMenu, ...remainingMenu } };
  return YAML.stringify(parsed, { lineWidth: 0 });
}

export async function listPages(): Promise<PageSummary[]> {
  const entries = await listDirectory('source').catch((error) => {
    if (String(error).includes('404')) return [];
    throw error;
  });
  const dirs = entries.filter((entry) => entry.type === 'dir' && !entry.name.startsWith('_'));
  const pages: Array<PageSummary | null> = await Promise.all(dirs.map(async (dir) => {
    try {
      const file = await getFile(`${dir.path}/index.md`);
      const parsed = parseMarkdown(file.content);
      const slug = slugFromPath(file.path);
      return { title: parsed.meta.title || slug, slug, path: file.path, url: `/${slug}/`, sha: file.sha, priority: normalizeNumber(parsed.meta.priority) };
    } catch (error) {
      if (String(error).includes('404')) return null;
      throw error;
    }
  }));
  return pages.filter((page): page is PageSummary => Boolean(page)).sort((a, b) => {
    const priority = (b.priority || 0) - (a.priority || 0);
    if (priority !== 0) return priority;
    return a.title.localeCompare(b.title);
  });
}

export async function getPage(path: string) {
  const file = await getFile(path);
  const parsed = parseMarkdown(file.content);
  const slug = slugFromPath(file.path);
  return { title: parsed.meta.title || slug, slug, path: file.path, url: `/${slug}/`, sha: file.sha, priority: normalizeNumber(parsed.meta.priority), body: parsed.body };
}

export async function savePage(input: SavePageInput) {
  const title = input.title.trim();
  if (!title) throw new Error('页面标题不能为空');
  const slug = slugify(input.slug || title);
  const menuLabel = (input.menuLabel || title).trim();
  const pagePath = input.path ? normalizeRepoPath(input.path) : pagePathFromSlug(slug);
  const pageUrl = `/${slugFromPath(pagePath)}/`;
  const existingFile = input.sha ? await getFile(pagePath).catch(() => null) : null;
  const existingMeta = existingFile ? parseMarkdown(existingFile.content).meta : null;
  const content = stringifyMarkdown({ ...existingMeta, title, date: existingMeta?.date || new Date().toISOString(), tags: existingMeta?.tags || [], categories: existingMeta?.categories || [], priority: input.priority ?? existingMeta?.priority }, input.body || '');
  const siteConfig = await getSiteConfig();
  const siteRaw = updateThemeMenu(siteConfig.raw, menuLabel, pageUrl);
  const existingPage = input.sha ? { sha: input.sha } : await getFile(pagePath).catch((error) => {
    if (String(error).includes('404')) return null;
    throw error;
  });
  const pageResult = await putFile({ path: pagePath, content, sha: existingPage?.sha, message: `${existingPage ? 'Update' : 'Create'} page: ${title}` });
  const siteResult = await putFile({ path: '_config.yml', content: siteRaw.endsWith('\n') ? siteRaw : `${siteRaw}\n`, sha: siteConfig.sha, message: `Update navigation: ${menuLabel}` });
  return { path: pagePath, url: pageUrl, menuLabel, configPath: '_config.yml', sha: pageResult.content.sha, commit: siteResult.commit, pageCommit: pageResult.commit };
}

export async function reorderPages(orderedPaths: string[]) {
  const uniquePaths = Array.from(new Set(orderedPaths));
  const pages = await Promise.all(uniquePaths.map(async (path) => {
    const file = await getFile(normalizeRepoPath(path));
    const parsed = parseMarkdown(file.content);
    const slug = slugFromPath(file.path);
    return { title: parsed.meta.title || slug, slug, path: file.path, url: `/${slug}/`, sha: file.sha, body: parsed.body, meta: parsed.meta };
  }));
  await Promise.all(pages.map((page, index) => {
    const priority = (pages.length - index) * 10;
    return putFile({
      path: page.path,
      sha: page.sha,
      content: stringifyMarkdown({ ...page.meta, title: page.title, priority }, page.body),
      message: `Update page priority: ${page.title}`
    });
  }));
  const siteConfig = await getSiteConfig();
  const siteRaw = updateThemeMenuOrder(siteConfig.raw, pages.map((page) => ({ title: page.title, url: page.url })));
  const siteResult = await putFile({ path: '_config.yml', content: siteRaw.endsWith('\n') ? siteRaw : `${siteRaw}\n`, sha: siteConfig.sha, message: 'Update page navigation order' });
  return { updated: pages.map((page, index) => ({ path: page.path, priority: (pages.length - index) * 10 })), commit: siteResult.commit };
}

export async function updatePagePriority(path: string, priority: number) {
  const file = await getFile(normalizeRepoPath(path));
  const parsed = parseMarkdown(file.content);
  const slug = slugFromPath(file.path);
  const title = parsed.meta.title || slug;
  const saved = await putFile({
    path: file.path,
    sha: file.sha,
    content: stringifyMarkdown({ ...parsed.meta, title, priority }, parsed.body),
    message: `Update page priority: ${title}`
  });
  return { path: file.path, sha: saved.content.sha, priority, commit: saved.commit };
}
