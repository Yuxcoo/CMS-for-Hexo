import { getConfig } from './config';
import { createRepository, fileExists, getAuthenticatedUser, listAccessibleRepos, putFile } from './github';
import { setRepoContext, type RepoContext } from './repo-context';

const starterPackageJson = {
  scripts: {
    clean: 'hexo clean',
    build: 'hexo generate',
    server: 'hexo server'
  },
  dependencies: {
    hexo: '^7.3.0',
    'hexo-generator-archive': '^2.0.0',
    'hexo-generator-category': '^2.0.0',
    'hexo-generator-index': '^4.0.0',
    'hexo-generator-tag': '^2.0.0',
    'hexo-renderer-ejs': '^2.0.0',
    'hexo-renderer-marked': '^6.3.0',
    'hexo-renderer-stylus': '^3.0.1',
    'hexo-server': '^3.0.0',
    'hexo-theme-landscape': '^1.1.0'
  }
};

const starterConfig = `title: My Hexo Blog
subtitle: ''
description: ''
author: Admin
language: zh-CN
timezone: Asia/Shanghai
url: https://example.com
root: /
permalink: :year/:month/:day/:title/
theme: landscape
deploy:
  type: ''
`;

export async function listRepositories() {
  const repos = await listAccessibleRepos();
  return repos.map((repo) => ({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch,
    htmlUrl: repo.html_url
  }));
}

export async function chooseRepository(context: RepoContext) {
  setRepoContext(context);
  return context;
}

export async function createHexoRepository(params: { name: string; description?: string; private?: boolean; initializeHexo?: boolean }) {
  const repo = await createRepository({ name: params.name, description: params.description, private: params.private, autoInit: true });
  const context = { owner: repo.owner.login, repo: repo.name };
  setRepoContext(context);
  if (params.initializeHexo ?? true) {
    await initializeHexoRepository(context);
  }
  return { context, repo };
}

export async function initializeHexoRepository(context?: RepoContext) {
  const config = getConfig();
  const files = [
    { path: 'package.json', content: `${JSON.stringify(starterPackageJson, null, 2)}\n` },
    { path: '_config.yml', content: starterConfig },
    { path: `${config.HEXO_POSTS_DIR}/hello-cms-for-hexo.md`, content: '---\ntitle: Hello CMS for Hexo\ndate: 2026-05-01T00:00:00.000Z\ntags:\n  - Hexo\ncategories:\n  - Blog\n---\n\nThis post was created by CMS for Hexo.\n' },
    { path: `${config.HEXO_DRAFTS_DIR}/.gitkeep`, content: '' },
    { path: `${config.HEXO_IMAGES_DIR}/.gitkeep`, content: '' }
  ];

  const created: string[] = [];
  for (const file of files) {
    if (await fileExists(file.path, context)) continue;
    await putFile({ path: file.path, content: file.content, message: `Initialize Hexo file: ${file.path}`, context });
    created.push(file.path);
  }
  return { created };
}

export async function getViewerLogin() {
  return getAuthenticatedUser();
}
