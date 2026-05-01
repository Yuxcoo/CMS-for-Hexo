import YAML from 'yaml';
import { getFile, listDirectory } from './github';
import type { DependencyVersion, VersionReport } from '@/types/version';

function versionItem(name: string, current: string, source: DependencyVersion['source']): DependencyVersion {
  return { name, current, source, updateHint: 'unknown' };
}

async function getLatestVersion(name: string): Promise<string | undefined> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name).replace('%40', '@')}/latest`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 * 60 }
    });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { version?: string };
    return body.version;
  } catch {
    return undefined;
  }
}

function cleanVersion(value: string): string {
  return value.replace(/^[~^<>= ]+/, '').trim();
}

async function enrichLatest(deps: DependencyVersion[]): Promise<DependencyVersion[]> {
  return Promise.all(
    deps.map(async (dep) => {
      if (dep.current.includes('folder') || dep.current === 'unknown') return dep;
      const latest = await getLatestVersion(dep.name);
      if (!latest) return dep;
      return {
        ...dep,
        latest,
        updateHint: cleanVersion(dep.current) === latest ? 'ok' : 'maybe-outdated'
      };
    })
  );
}

function uniqueDeps(deps: DependencyVersion[]): DependencyVersion[] {
  const seen = new Set<string>();
  return deps.filter((dep) => {
    const key = `${dep.name}:${dep.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectDeps(packageJson: Record<string, unknown>): DependencyVersion[] {
  const deps = (packageJson.dependencies || {}) as Record<string, string>;
  const devDeps = (packageJson.devDependencies || {}) as Record<string, string>;
  const all: DependencyVersion[] = [];
  for (const [name, current] of Object.entries(deps)) {
    if (name === 'hexo' || name.startsWith('hexo-')) all.push(versionItem(name, current, name.startsWith('hexo-theme-') ? 'theme' : 'dependencies'));
  }
  for (const [name, current] of Object.entries(devDeps)) {
    if (name === 'hexo' || name.startsWith('hexo-')) all.push(versionItem(name, current, name.startsWith('hexo-theme-') ? 'theme' : 'devDependencies'));
  }
  return all;
}

async function detectThemeFromConfig(): Promise<string | undefined> {
  try {
    const config = await getFile('_config.yml');
    const parsed = YAML.parse(config.content) as { theme?: unknown } | null;
    return typeof parsed?.theme === 'string' ? parsed.theme : undefined;
  } catch {
    return undefined;
  }
}

async function detectThemeVersion(themeName?: string): Promise<DependencyVersion | undefined> {
  if (!themeName) return undefined;
  const packagePath = `themes/${themeName}/package.json`;
  try {
    const file = await getFile(packagePath);
    const parsed = JSON.parse(file.content) as { name?: string; version?: string };
    return versionItem(parsed.name || themeName, parsed.version || 'unknown', 'theme');
  } catch {
    return versionItem(themeName, 'theme folder or package.json not found', 'theme');
  }
}

async function detectPackageManager(): Promise<string | undefined> {
  const root = await listDirectory('').catch(() => []);
  if (root.some((file) => file.name === 'pnpm-lock.yaml')) return 'pnpm';
  if (root.some((file) => file.name === 'yarn.lock')) return 'yarn';
  if (root.some((file) => file.name === 'package-lock.json')) return 'npm';
  return undefined;
}

export async function getVersionReport(): Promise<VersionReport> {
  const packageFile = await getFile('package.json');
  const packageJson = JSON.parse(packageFile.content) as Record<string, unknown>;
  const all = collectDeps(packageJson);
  const themeName = await detectThemeFromConfig();
  const themeFromFolder = await detectThemeVersion(themeName);
  const themeFromPackage = all.find((dep) => dep.source === 'theme');
  const hexo = all.find((dep) => dep.name === 'hexo');
  const plugins = await enrichLatest(all.filter((dep) => dep.name.startsWith('hexo-') && dep.name !== 'hexo' && dep.source !== 'theme'));
  const enrichedHexo = hexo ? (await enrichLatest([hexo]))[0] : undefined;
  const theme = themeFromPackage || themeFromFolder;
  const enrichedTheme = theme ? (await enrichLatest([theme]))[0] : undefined;
  const combined = enrichedTheme && !all.some((dep) => dep.name === enrichedTheme.name) ? [...all, enrichedTheme] : all;
  return {
    packageManager: await detectPackageManager(),
    hexo: enrichedHexo,
    theme: enrichedTheme,
    plugins,
    all: uniqueDeps(await enrichLatest(combined)),
    checkedAt: new Date().toISOString(),
    note: '当前版本来自仓库 package.json 和主题 package.json；latest 字段来自 npm registry。若部署环境无法访问 registry，则只显示当前版本。'
  };
}
