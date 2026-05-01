# CMS for Hexo

一个个人自用的 Hexo 博客后台。它通过 GitHub API 管理 Hexo 仓库里的 Markdown、图片、配置与部署状态，可用 Docker 部署到 Render、Railway、Fly.io 或 VPS。

## 功能

- 管理员密码登录，服务端 session cookie
- 文章列表、搜索、创建、编辑、删除
- 草稿列表、创建、编辑、发布、转草稿
- Markdown 编辑与预览
- 图片上传到 Hexo 仓库目录并生成 Markdown 链接
- 最近提交、GitHub Actions 状态、手动触发 workflow
- 检查 Hexo、主题与插件依赖版本，辅助更新判断
- Docker 生产部署

## 环境变量

复制 `.env.example` 为 `.env.local`，然后填入：

```env
ADMIN_PASSWORD=change-me
SESSION_SECRET=replace-with-a-long-random-string
GITHUB_TOKEN=github_pat_xxx
GITHUB_OWNER=your-github-user-or-org
GITHUB_REPO=your-hexo-repo
GITHUB_BRANCH=main
HEXO_POSTS_DIR=source/_posts
HEXO_DRAFTS_DIR=source/_drafts
HEXO_IMAGES_DIR=source/images
GITHUB_WORKFLOW_ID=deploy.yml
```

`GITHUB_OWNER` 和 `GITHUB_REPO` 可以预先填写，也可以留空。留空时，登录后台后进入“仓库”页面，选择已有仓库或创建一个新的 Hexo 仓库。

GitHub fine-grained token 建议授权目标 Hexo 仓库；如果需要在后台新建仓库，需要 token 具备创建仓库能力。至少需要：

- Contents: Read and write
- Actions: Read and write，若要查看和触发部署 workflow
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

Render 会自动注入 `PORT`，Next standalone server 可直接监听平台端口。若你的 Hexo 仓库通过 GitHub Actions 部署，填入 `GITHUB_WORKFLOW_ID` 后可在后台手动触发。

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
- 创建新仓库：调用 GitHub API 创建仓库，并写入基础 Hexo 文件

初始化会写入：

- `package.json`
- `_config.yml`
- `source/_posts/hello-cms-for-hexo.md`
- `source/_drafts/.gitkeep`
- `source/images/.gitkeep`

当前选择的仓库保存在 HTTP-only cookie 中；如果环境变量里预设了 `GITHUB_OWNER` 和 `GITHUB_REPO`，则会作为默认仓库。

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
SESSION_SECRET=at-least-16-characters
```

`ADMIN_PASSWORD` 是登录密码；`SESSION_SECRET` 只用于签名 cookie，不是登录密码。云平台环境变量不要额外包引号，若平台自动保留前后空格或引号，应用会尽量兼容处理。

进入后台后，文章、仓库、部署、版本检查等 GitHub 功能还需要：

```env
GITHUB_TOKEN=github_pat_or_classic_token
GITHUB_BRANCH=main
HEXO_POSTS_DIR=source/_posts
HEXO_DRAFTS_DIR=source/_drafts
HEXO_IMAGES_DIR=source/images
```

`GITHUB_OWNER` 和 `GITHUB_REPO` 可以留空，之后在“仓库”页选择或创建。若登录提示 `Missing or invalid auth environment variables`，说明 `ADMIN_PASSWORD` 或 `SESSION_SECRET` 没有在平台环境变量里正确配置。
