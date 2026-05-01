import YAML from 'yaml';
import { getFile, putFile } from './github';

export type SiteConfigResult = {
  sha: string;
  raw: string;
  data: Record<string, unknown>;
};

const defaultConfig = `title: My Hexo Blog
subtitle: ''
description: ''
author: Admin
language: zh-CN
timezone: Asia/Shanghai
url: https://example.com
root: /
permalink: :year/:month/:day/:title/
theme: landscape
`;

export async function getSiteConfig(): Promise<SiteConfigResult> {
  try {
    const file = await getFile('_config.yml');
    return { sha: file.sha, raw: file.content, data: (YAML.parse(file.content) as Record<string, unknown>) || {} };
  } catch (error) {
    if (String(error).includes('404')) return { sha: '', raw: defaultConfig, data: (YAML.parse(defaultConfig) as Record<string, unknown>) || {} };
    throw error;
  }
}

export async function saveSiteConfig(params: { raw: string; sha?: string }) {
  let parsed: unknown;
  try {
    parsed = YAML.parse(params.raw);
  } catch (error) {
    throw new Error(`Invalid YAML: ${error instanceof Error ? error.message : 'parse failed'}`);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Config YAML must be an object');
  return putFile({ path: '_config.yml', content: params.raw.endsWith('\n') ? params.raw : `${params.raw}\n`, sha: params.sha || undefined, message: 'Update Hexo site config' });
}

export function mergeCommonSiteFields(currentRaw: string, fields: Record<string, string>) {
  const data = (YAML.parse(currentRaw) as Record<string, unknown>) || {};
  for (const [key, value] of Object.entries(fields)) data[key] = value;
  return YAML.stringify(data, { lineWidth: 0 });
}
