import { getConfig } from './config';
import { createRepository, fileExists, getAuthenticatedUser, getFile, listAccessibleRepos, putFiles } from './github';
import { getRepoContext, setRepoContext, type RepoContext } from './repo-context';

const starterPackageJson = {
  private: true,
  hexo: {
    version: '^7.3.0'
  },
  scripts: {
    clean: 'hexo clean',
    build: 'hexo generate',
    server: 'hexo server',
    deploy: 'hexo generate'
  },
  dependencies: {
    hexo: '^7.3.0',
    'hexo-cli': '^4.3.2',
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

type StarterFile = {
  path: string;
  content: string;
  overwrite: boolean;
  merge?: (current: string) => string;
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
theme_config:
  menu:
    Home: /
    About: /about/
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
  contents: write

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5
      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Install dependencies
        run: |
          node --version
          npm install
          node -e "require('hexo'); console.log('hexo package loaded')"
      - name: Prepare Hexo theme
        run: |
          if [ ! -d themes/landscape/layout ] && [ -d node_modules/hexo-theme-landscape ]; then
            rm -rf themes/landscape
            mkdir -p themes
            cp -R node_modules/hexo-theme-landscape themes/landscape
          fi
          if grep -Eq '^[[:space:]]*theme:[[:space:]]*landscape[[:space:]]*$' _config.yml && [ ! -d themes/landscape/layout ]; then
            echo "::error::Theme landscape is configured, but themes/landscape/layout is missing."
            find themes -maxdepth 3 -type f -print || true
            exit 1
          fi
          find themes -maxdepth 3 -type f -print | sort | head -80
      - name: Build Hexo site
        run: |
          pwd
          ls -la
          test -f package.json
          test -f _config.yml
          npm run clean
          npm run build
          if [ ! -d public ]; then
            echo "Hexo generate finished without creating public. Repository root contents:"
            ls -la
            echo "Hexo config:"
            sed -n '1,180p' _config.yml
            echo "Installed top-level packages:"
            npm ls --depth=0 || true
            echo "Theme directory contents:"
            find themes -maxdepth 4 -type f -print | sort | head -120 || true
            echo "Source directory contents:"
            find source -maxdepth 3 -type f -print || true
            echo "Hexo database:"
            ls -la db.json || true
            exit 1
          fi
          find . -maxdepth 2 -type d -name public -print
      - name: Verify generated site
        run: |
          if [ ! -d public ]; then
            echo "Hexo did not create the public directory. Repository root contents:"
            ls -la
            echo "Hexo config:"
            sed -n '1,180p' _config.yml
            echo "Installed top-level packages:"
            npm ls --depth=0 || true
            echo "Theme directory contents:"
            find themes -maxdepth 4 -type f -print | sort | head -120 || true
            echo "Source directory contents:"
            find source -maxdepth 3 -type f -print || true
            echo "Hexo database:"
            ls -la db.json || true
            exit 1
          fi
          ls -la public
          if [ ! -f public/index.html ]; then
            echo "Hexo generated public, but public/index.html is missing. Public files:"
            find public -maxdepth 4 -type f -print | sort
            echo "Hexo database:"
            ls -la db.json || true
            exit 1
          fi
      - name: Publish to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
          publish_branch: gh-pages
          force_orphan: true
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

After the first successful publish, open this repository's Settings -> Pages and set Source to \`Deploy from a branch\`, Branch to \`gh-pages\`, and Folder to \`/ (root)\`. This one-time setting is required because the default GitHub Actions token can push the \`gh-pages\` branch but cannot reliably switch the Pages source for a new repository.

Expected site URL: ${getSiteUrl(context)}
`;
}

function mergePackageJson(current: string) {
  const parsed = JSON.parse(current || '{}') as {
    private?: boolean;
    hexo?: Record<string, unknown>;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return `${JSON.stringify(
    {
      ...parsed,
      private: parsed.private ?? starterPackageJson.private,
      hexo: { ...starterPackageJson.hexo, ...(parsed.hexo || {}) },
      scripts: { ...starterPackageJson.scripts, ...(parsed.scripts || {}) },
      dependencies: { ...starterPackageJson.dependencies, ...(parsed.dependencies || {}) }
    },
    null,
    2
  )}\n`;
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
  const target = context || getRepoContext();
  const now = new Date().toISOString();
  const files: StarterFile[] = [
    { path: 'package.json', content: `${JSON.stringify(starterPackageJson, null, 2)}\n`, overwrite: true, merge: mergePackageJson },
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
  const pendingFiles: Array<{ path: string; content: string }> = [];
  for (const file of files) {
    const existing = await fileExists(file.path, target);
    if (existing && !file.overwrite) continue;
    const current = existing ? await getFile(file.path, target) : null;
    const content = current && file.merge ? file.merge(current.content) : file.content;
    pendingFiles.push({ path: file.path, content });
    created.push(file.path);
  }
  await putFiles({ files: pendingFiles, message: 'Initialize Hexo project files', context: target });
  return { created };
}

export async function getViewerLogin() {
  return getAuthenticatedUser();
}
