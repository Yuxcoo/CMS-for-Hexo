import YAML from 'yaml';
import { getFile, putFiles } from './github';
import { slugify } from './paths';
import { stringifyMarkdown } from './hexo';

type CreatePageInput = {
  title: string;
  slug?: string;
  body?: string;
  menuLabel?: string;
};

async function getThemeConfigPath(): Promise<{ path: string; raw: string }> {
  const site = await getFile('_config.yml');
  const siteConfig = YAML.parse(site.content) as { theme?: unknown } | null;
  const theme = typeof siteConfig?.theme === 'string' && siteConfig.theme.trim() ? siteConfig.theme.trim() : 'landscape';
  const candidates = [`_config.${theme}.yml`, `themes/${theme}/_config.yml`];
  for (const path of candidates) {
    try {
      const file = await getFile(path);
      return { path, raw: file.content };
    } catch (error) {
      if (!String(error).includes('404')) throw error;
    }
  }
  return { path: `_config.${theme}.yml`, raw: '# Theme config\n' };
}

function updateMenu(raw: string, label: string, url: string): string {
  const parsed = (YAML.parse(raw) || {}) as Record<string, unknown>;
  const existingMenu = parsed.menu && typeof parsed.menu === 'object' && !Array.isArray(parsed.menu) ? parsed.menu as Record<string, unknown> : {};
  parsed.menu = { ...existingMenu, [label]: url };
  return YAML.stringify(parsed, { lineWidth: 0 });
}

export async function createPage(input: CreatePageInput) {
  const title = input.title.trim();
  if (!title) throw new Error('页面标题不能为空');
  const slug = slugify(input.slug || title);
  const menuLabel = (input.menuLabel || title).trim();
  const pagePath = `source/${slug}/index.md`;
  const pageUrl = `/${slug}/`;
  const content = stringifyMarkdown({ title, date: new Date().toISOString(), tags: [], categories: [] }, input.body || '');
  const themeConfig = await getThemeConfigPath();
  const themeRaw = updateMenu(themeConfig.raw, menuLabel, pageUrl);
  const result = await putFiles({
    message: `Create page: ${title}`,
    files: [
      { path: pagePath, content },
      { path: themeConfig.path, content: themeRaw.endsWith('\n') ? themeRaw : `${themeRaw}\n` }
    ]
  });
  return { path: pagePath, url: pageUrl, menuLabel, themeConfigPath: themeConfig.path, commit: result?.commit };
}
