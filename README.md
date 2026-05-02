# CMS for Hexo

一个个人自用的 Hexo 博客后台。它通过 GitHub API 管理 Hexo 仓库里的 Markdown、图片、配置与发布状态，可用 Docker 部署到 Render、Railway、Fly.io 或 VPS。

## 功能

- 管理员密码登录，服务端 session cookie
- 文章列表、搜索、创建、编辑、删除
- 草稿列表、创建、编辑、发布、转草稿
- Markdown 编辑与预览
- 图片上传到 Hexo 仓库目录并生成 Markdown 链接
- 发布中心、GitHub Actions 状态、手动触发发布
- 检查 Hexo、主题与插件依赖版本，辅助更新判断
- Docker 生产部署

## 环境变量

复制 `.env.example` 为 `.env.local`，然后填入：

```env
ADMIN_PASSWORD=change-me
SESSION_SECRET=replace-with-a-random-string
GITHUB_TOKEN=github_pat_xxx
GITHUB_OWNER=your-github-user-or-org
GITHUB_REPO=your-hexo-repo
GITHUB_BRANCH=main
HEXO_POSTS_DIR=source/_posts
HEXO_DRAFTS_DIR=source/_drafts
HEXO_IMAGES_DIR=source/images
GITHUB_WORKFLOW_ID=pages.yml
```

`GITHUB_OWNER` 和 `GITHUB_REPO` 可以预先填写，也可以留空。留空时，登录后台后进入“仓库”页面，选择已有仓库或创建一个新的 Hexo 仓库。

GitHub fine-grained token 建议授权目标 Hexo 仓库；如果需要在后台新建仓库，需要 token 具备创建仓库能力。至少需要：

- Contents: Read and write
- Actions: Read and write，若要查看和触发发布 workflow
- Metadata: Read

如果要列出并新建个人仓库，classic token 需要 `repo` 权限；fine-grained token 对“创建仓库”的支持取决于 GitHub 当前权限模型。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## Docker

```bash
docker build -t cms-for-hexo .
docker run --env-file .env.local -p 3000:3000 cms-for-hexo
```

Render 部署时选择 Docker Web Service，并把 `.env.example` 中的变量填入 Render Environment。

Render 会自动注入 `PORT`，Next standalone server 可直接监听平台端口。若你的 Hexo 仓库通过 GitHub Actions 发布，填入 `GITHUB_WORKFLOW_ID` 后可指定后台“发布”页面触发的 workflow；未填写时会自动查找 `pages.yml`、`deploy.yml` 等常见发布 workflow。

镜像内已显式设置 `HOSTNAME=0.0.0.0`，用于避免 Next standalone 在 Render 上绑定到容器 hostname 导致公网访问 502。

## GHCR 镜像

仓库包含 GitHub Actions 工作流 `.github/workflows/ghcr.yml`，会在以下场景构建并推送 Docker 镜像到 GitHub Container Registry：

- push 到 `main`
- push `v*.*.*` tag
- 手动运行 workflow

镜像地址：

```bash
docker pull ghcr.io/yuxcoo/cms-for-hexo:latest
```

运行镜像：

```bash
docker run --env-file .env.local -p 3000:3000 ghcr.io/yuxcoo/cms-for-hexo:latest
```

如果包页面没有自动公开，在 GitHub 仓库的 Packages 页面把 package visibility 设置为 Public。

## 版本检查

后台的“版本检查”页会读取博客仓库里的：

- `package.json` 中的 `hexo`、`hexo-*` 插件和 `hexo-theme-*` 主题依赖
- `_config.yml` 中的 `theme` 字段
- `themes/<theme>/package.json` 中的主题版本
- `package-lock.json`、`pnpm-lock.yaml` 或 `yarn.lock` 来识别包管理器

如果部署环境可以访问 `registry.npmjs.org`，还会显示 npm latest 版本，便于判断 Hexo、主题和插件是否需要更新。

## 第一版范围

当前版本面向个人自用，默认单管理员、单 Hexo 仓库、GitHub token 服务端保存。浏览器端不会接触 GitHub token。

## 仓库连接与初始化

后台的“仓库”页支持两种模式：

- 连接已有仓库：从当前 token 可访问的仓库中选择一个作为 Hexo 存储仓库
- 创建新仓库：调用 GitHub API 创建仓库，并写入可直接构建发布的 Hexo 项目

初始化会写入：

- `package.json`
- `_config.yml`
- `.github/workflows/pages.yml`
- `README.md`
- `source/_posts/hello-cms-for-hexo.md`
- `source/about/index.md`
- `scaffolds/post.md`
- `scaffolds/draft.md`
- `scaffolds/page.md`
- `source/_drafts/.gitkeep`
- `source/images/.gitkeep`

当前选择的仓库保存在 HTTP-only cookie 中；如果环境变量里预设了 `GITHUB_OWNER` 和 `GITHUB_REPO`，则会作为默认仓库。

新建仓库会通过 GitHub Actions 自动安装 Hexo 依赖、构建静态文件，并发布到 `gh-pages` 分支。出于 GitHub Pages 权限限制，默认 workflow 使用的 `GITHUB_TOKEN` 可以自动推送 `gh-pages` 分支，但不能可靠地替你完成首次 Pages Source 切换。创建后需要在 GitHub 仓库 Settings → Pages 中设置 Source 为 `Deploy from a branch`，分支选择 `gh-pages`，目录选择 `/ (root)`；设置一次后，后续发布会自动更新。

访问地址通常是：

- 用户/组织站点仓库：`https://<owner>.github.io/`
- 普通项目仓库：`https://<owner>.github.io/<repo>/`

如果“立即发布”提示找不到 workflow，可以在“仓库”页点击“补全当前仓库”，或手动在博客仓库中添加 `.github/workflows/pages.yml`。GitHub token 需要有 Actions 读写权限。

如果 GitHub Pages workflow 报错 `Dependencies lock file is not found`，说明旧模板启用了 npm cache 但仓库没有 lockfile。重新部署最新版 CMS 后，在“仓库”页点击“补全当前仓库”，它会更新 `.github/workflows/pages.yml`。

如果 GitHub Pages workflow 报错 `Resource not accessible by integration`、`Get Pages site failed` 或 `Pages site Not Found`，说明 GitHub Actions 默认 token 无法自动创建或切换 Pages 站点。新版模板改为发布到 `gh-pages` 分支，避开 Pages API 权限限制。重新部署最新版 CMS 后，在“仓库”页点击“补全当前仓库”即可更新 workflow，然后在 GitHub Pages 设置里手动选择 `gh-pages / root`。

如果 `gh-pages` 分支只有 `.nojekyll`，说明静态站点没有生成成功。新版 workflow 会在发布前检查 `public/index.html`，没有首页文件会直接失败并在 Actions 日志中显示 `public` 目录内容。

如果 workflow 在 `Verify generated site` 步骤报 `public: No such file or directory`，通常是旧仓库缺少 `hexo-cli` 依赖。重新部署最新版 CMS 后，在“仓库”页点击“补全当前仓库”，它会合并更新 `package.json`，补上 `hexo-cli` 和缺失的 Hexo 基础依赖。

如果已安装 `hexo-theme-landscape` 但仍未生成 `public`，可能是 Hexo 没有在 `themes/landscape` 目录找到主题。新版 workflow 会在构建前把 `node_modules/hexo-theme-landscape` 同步到 `themes/landscape`。

## 站点配置

“配置”页可以编辑 Hexo 根目录 `_config.yml`，支持常用字段表单和完整 YAML 两种模式。保存前会校验 YAML 是否能解析为对象。

主题配置会根据 `_config.yml` 的 `theme` 字段自动查找：

- `_config.<theme>.yml`
- `themes/<theme>/_config.yml`

如果都不存在，会默认创建 `_config.<theme>.yml`。

## 云部署排障

如果云平台能启动容器，但浏览器访问异常，先测试：

- `/login`：应显示登录页
- `/api/health`：应返回 JSON

`/api/health` 会返回 `auth.adminPasswordLength` 和 `auth.sessionSecretLength`，只显示长度不显示值，可用来确认云平台实际读取到的环境变量。

登录只依赖：

```env
ADMIN_PASSWORD=your-password
SESSION_SECRET=any-random-string
```

`ADMIN_PASSWORD` 是登录密码；`SESSION_SECRET` 只用于签名 cookie，不是登录密码。`SESSION_SECRET` 只要求非空，但生产环境建议使用随机长字符串。云平台环境变量不要额外包引号，若平台自动保留前后空格或引号，应用会尽量兼容处理。

进入后台后，文章、仓库、发布、版本检查等 GitHub 功能还需要：

```env
GITHUB_TOKEN=github_pat_or_classic_token
GITHUB_BRANCH=main
HEXO_POSTS_DIR=source/_posts
HEXO_DRAFTS_DIR=source/_drafts
HEXO_IMAGES_DIR=source/images
```

`GITHUB_OWNER` 和 `GITHUB_REPO` 可以留空，之后在“仓库”页选择或创建。若登录提示 `Missing or invalid auth environment variables`，说明 `ADMIN_PASSWORD` 或 `SESSION_SECRET` 没有在平台环境变量里正确配置。
