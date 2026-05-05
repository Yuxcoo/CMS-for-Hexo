import YAML from 'yaml';
import { getFile, listDirectory, putFile } from './github';
import type { DependencyVersion, VersionReport } from '@/types/version';

function versionItem(name: string, current: string, source: DependencyVersion['source'], packageName?: string): DependencyVersion {
  return { name, current, source, updateHint: 'unknown', packageName: packageName || name };
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
        updateHint: cleanVersion(dep.current) === latest ? 'ok' : 'maybe-outdated',
        canUpgrade: dep.source === 'dependencies' || dep.source === 'devDependencies' || (dep.source === 'theme' && dep.packageName?.startsWith('hexo-theme-'))
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
    return versionItem(themeName, parsed.version || 'unknown', 'theme', parsed.name || themeName);
  } catch {
    return versionItem(themeName, 'theme folder or package.json not found', 'theme', themeName);
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
  const themePackageName = themeFromPackage?.packageName || themeFromFolder?.packageName;
  const theme = themeFromFolder || themeFromPackage;
  const themeCandidate = theme ? { ...theme, name: themePackageName || theme.name } : undefined;
  const enrichedTheme = themeCandidate ? (await enrichLatest([themeCandidate]))[0] : undefined;
  const normalizedTheme = enrichedTheme
    ? {
      ...enrichedTheme,
      name: themeFromFolder?.name || theme?.name || enrichedTheme.name,
      current: themeFromFolder?.current || theme?.current || enrichedTheme.current,
      packageName: themePackageName || enrichedTheme.packageName,
      canUpgrade: Boolean(themePackageName?.startsWith('hexo-theme-'))
    }
    : undefined;
  const combined = [
    ...all.filter((dep) => dep.source !== 'theme'),
    ...(normalizedTheme ? [normalizedTheme] : [])
  ];
  return {
    packageManager: await detectPackageManager(),
    hexo: enrichedHexo,
    theme: normalizedTheme,
    plugins,
    all: uniqueDeps(await enrichLatest(combined)),
    checkedAt: new Date().toISOString(),
    note: '当前版本来自仓库 package.json 和 themes/<active-theme>/package.json；latest 字段来自 npm registry。依赖与 npm 安装主题支持一键写回 package.json 升级，自定义本地主题会优先展示自身 package.json 版本。'
  };
}

export async function upgradeDependencyVersion(input: { name: string; source: 'dependencies' | 'devDependencies' | 'theme'; version?: string }) {
  const packageFile = await getFile('package.json');
  const packageJson = JSON.parse(packageFile.content) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const bucket = input.source === 'dependencies'
    ? (packageJson.dependencies ||= {})
    : input.source === 'devDependencies'
      ? (packageJson.devDependencies ||= {})
      : (packageJson.dependencies?.[input.name] ? (packageJson.dependencies ||= {}) : (packageJson.devDependencies ||= {}));
  const current = bucket[input.name];
  if (!current) throw new Error(`package.json 中找不到 ${input.source}.${input.name}`);
  const latest = input.version || await getLatestVersion(input.name);
  if (!latest) throw new Error(`无法获取 ${input.name} 的最新版本`);
  bucket[input.name] = `^${latest}`;
  const content = `${JSON.stringify(packageJson, null, 2)}\n`;
  const result = await putFile({
    path: 'package.json',
    content,
    sha: packageFile.sha,
    message: `Upgrade ${input.name} to ${latest}`
  });
  return { name: input.name, source: input.source, previous: current, current: bucket[input.name], latest, sha: result.content.sha, commit: result.commit };
}
