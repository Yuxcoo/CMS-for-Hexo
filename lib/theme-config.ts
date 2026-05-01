import YAML from 'yaml';
import { getFile, putFile } from './github';

export type ThemeConfigResult = {
  path: string;
  sha: string;
  raw: string;
  theme?: string;
};

async function detectThemeName(): Promise<string | undefined> {
  try {
    const site = await getFile('_config.yml');
    const data = YAML.parse(site.content) as { theme?: unknown } | null;
    return typeof data?.theme === 'string' ? data.theme : undefined;
  } catch {
    return undefined;
  }
}

export async function getThemeConfig(): Promise<ThemeConfigResult> {
  const theme = await detectThemeName();
  const candidates = [theme ? `_config.${theme}.yml` : '', theme ? `themes/${theme}/_config.yml` : ''].filter(Boolean);
  for (const path of candidates) {
    try {
      const file = await getFile(path);
      return { path, sha: file.sha, raw: file.content, theme };
    } catch (error) {
      if (!String(error).includes('404')) throw error;
    }
  }
  if (!theme) throw new Error('No theme configured in _config.yml');
  return { path: `_config.${theme}.yml`, sha: '', raw: '# Theme config\n', theme };
}

export async function saveThemeConfig(params: { path: string; raw: string; sha?: string }) {
  try {
    YAML.parse(params.raw);
  } catch (error) {
    throw new Error(`Invalid YAML: ${error instanceof Error ? error.message : 'parse failed'}`);
  }
  return putFile({ path: params.path, content: params.raw.endsWith('\n') ? params.raw : `${params.raw}\n`, sha: params.sha || undefined, message: `Update theme config: ${params.path}` });
}
