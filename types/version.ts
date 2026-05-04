export type DependencyVersion = {
  name: string;
  current: string;
  wanted?: string;
  latest?: string;
  source: 'dependencies' | 'devDependencies' | 'theme' | 'plugin';
  updateHint: 'unknown' | 'ok' | 'maybe-outdated';
  canUpgrade?: boolean;
  packageName?: string;
};

export type VersionReport = {
  packageManager?: string;
  hexo?: DependencyVersion;
  theme?: DependencyVersion;
  plugins: DependencyVersion[];
  all: DependencyVersion[];
  checkedAt: string;
  note?: string;
};
