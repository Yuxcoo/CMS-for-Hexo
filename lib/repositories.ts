import { getConfig } from './config';
import { createRepository, fileExists, getAuthenticatedUser, getFile, listAccessibleRepos, putFile } from './github';
import { setRepoContext, type RepoContext } from './repo-context';

const starterPackageJson = {
  private: true,
  scripts: {
    clean: 'hexo clean',
    build: 'hexo generate',
    server: 'hexo server',
    deploy: 'hexo generate'
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

function getSiteUrl(context: RepoContext) {
  const isUserPage = context.repo.toLowerCase() === `${context.owner.toLowerCase()}.github.io`;
  return `https://${context.owner}.github.io${isUserPage ? '' : `/${context.repo}`}`;
}

function getSiteRoot(context: RepoContext) {
  return context.repo.toLowerCase() === `${context.owner.toLowerCase()}.github.io` ? '/' : `/${context.repo}/`;
}

function starterConfig(context: RepoContext) {
  return `title: My Hexo Blog
subtitle: Powered by CMS for Hexo
description: A Hexo blog managed from a browser admin panel.
author: ${context.owner}
language: zh-CN
timezone: Asia/Shanghai
url: ${getSiteUrl(context)}
root: ${getSiteRoot(context)}
permalink: :year/:month/:day/:title/
pretty_urls:
  trailing_index: true
  trailing_html: true
theme: landscape
highlight:
  enable: true
  line_number: true
  auto_detect: false
  tab_replace: ''
deploy:
  type: ''
`;
}

const pagesWorkflow = `name: Deploy Hexo to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm install
      - name: Build Hexo site
        run: npm run build
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

function starterReadme(context: RepoContext) {
  return `# ${context.repo}

This is a Hexo blog repository initialized by CMS for Hexo.

## Local preview

\`\`\`bash
npm install
npm run server
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Publish

GitHub Actions builds the site and publishes it to GitHub Pages.

Expected site URL: ${getSiteUrl(context)}
`;
}

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
  const target = context || { owner: config.GITHUB_OWNER || 'owner', repo: config.GITHUB_REPO || 'hexo-blog' };
  const now = new Date().toISOString();
  const files = [
    { path: 'package.json', content: `${JSON.stringify(starterPackageJson, null, 2)}\n`, overwrite: false },
    { path: '_config.yml', content: starterConfig(target), overwrite: false },
    { path: '.github/workflows/pages.yml', content: pagesWorkflow, overwrite: true },
    { path: 'README.md', content: starterReadme(target), overwrite: false },
    { path: `${config.HEXO_POSTS_DIR}/hello-cms-for-hexo.md`, content: `---\ntitle: Hello CMS for Hexo\ndate: ${now}\ntags:\n  - Hexo\n  - CMS\ncategories:\n  - Blog\n---\n\nWelcome to your new Hexo blog. This post was created by CMS for Hexo.\n\nOpen the CMS, edit this article, add images, and publish changes through GitHub Actions.\n`, overwrite: false },
    { path: 'source/about/index.md', content: `---\ntitle: About\ndate: ${now}\n---\n\nThis blog is managed with CMS for Hexo.\n`, overwrite: false },
    { path: 'scaffolds/post.md', content: '---\ntitle: {{ title }}\ndate: {{ date }}\ntags:\ncategories:\n---\n', overwrite: false },
    { path: 'scaffolds/draft.md', content: '---\ntitle: {{ title }}\ntags:\ncategories:\n---\n', overwrite: false },
    { path: 'scaffolds/page.md', content: '---\ntitle: {{ title }}\ndate: {{ date }}\n---\n', overwrite: false },
    { path: `${config.HEXO_DRAFTS_DIR}/.gitkeep`, content: '', overwrite: false },
    { path: `${config.HEXO_IMAGES_DIR}/.gitkeep`, content: '', overwrite: false }
  ];

  const created: string[] = [];
  for (const file of files) {
    const existing = await fileExists(file.path, context);
    if (existing && !file.overwrite) continue;
    const current = existing ? await getFile(file.path, context) : null;
    await putFile({ path: file.path, content: file.content, sha: current?.sha, message: `${existing ? 'Update' : 'Initialize'} Hexo file: ${file.path}`, context });
    created.push(file.path);
  }
  return { created };
}

export async function getViewerLogin() {
  return getAuthenticatedUser();
}
