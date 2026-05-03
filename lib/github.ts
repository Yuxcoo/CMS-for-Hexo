import { getConfig } from './config';
import { assertSafeRepoPath } from './paths';
import { getRepoContext, type RepoContext } from './repo-context';
import type { GitHubCommit, GitHubFile, GitHubWorkflow, WorkflowRun } from '@/types/github';

const apiBase = 'https://api.github.com';

function encodePath(path: string): string {
  if (!path) return '';
  return assertSafeRepoPath(path).split('/').map(encodeURIComponent).join('/');
}

function branchFor(context: RepoContext): string {
  return context.branch || getConfig().GITHUB_BRANCH;
}

function isNotFound(error: unknown) {
  return String(error).includes('GitHub API 404');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getConfig();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function repoApiPath(suffix: string): string {
  return repoApiPathFor(getRepoContext(), suffix);
}

export function repoApiPathFor(context: RepoContext, suffix: string): string {
  return `/repos/${context.owner}/${context.repo}${suffix}`;
}

export async function listAccessibleRepos() {
  return githubFetch<Array<{ id: number; name: string; full_name: string; private: boolean; default_branch: string; html_url: string; owner: { login: string } }>>(
    '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member'
  );
}

export async function getAuthenticatedUser() {
  return githubFetch<{ login: string }>('/user');
}

export async function getRepository(context?: RepoContext) {
  const target = context || getRepoContext();
  return githubFetch<{ name: string; full_name: string; private: boolean; default_branch: string; html_url: string; owner: { login: string } }>(repoApiPathFor(target, ''));
}

export async function createRepository(params: { name: string; description?: string; private?: boolean; autoInit?: boolean }) {
  return githubFetch<{ name: string; full_name: string; private: boolean; default_branch: string; html_url: string; owner: { login: string } }>('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      description: params.description || 'Hexo content repository managed by CMS for Hexo',
      private: params.private ?? false,
      auto_init: params.autoInit ?? true
    })
  });
}

export async function fileExists(path: string, context?: RepoContext): Promise<boolean> {
  try {
    await getFile(path, context);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function listDirectory(path: string): Promise<GitHubFile[]> {
  const context = getRepoContext();
  const encoded = encodePath(path);
  const contentsPath = encoded ? `/contents/${encoded}` : '/contents';
  const result = await githubFetch<GitHubFile | GitHubFile[]>(
    repoApiPathFor(context, `${contentsPath}?ref=${encodeURIComponent(branchFor(context))}`)
  );
  return Array.isArray(result) ? result : [];
}

export async function getFile(path: string, context?: RepoContext): Promise<{ content: string; sha: string; path: string; name: string; size: number }> {
  const target = context || getRepoContext();
  const suffix = `/contents/${encodePath(path)}?ref=${encodeURIComponent(branchFor(target))}`;
  const file = await githubFetch<GitHubFile & { content: string; encoding: string }>(repoApiPathFor(target, suffix));
  const content = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { content, sha: file.sha, path: file.path, name: file.name, size: file.size };
}

export async function putFile(params: { path: string; content?: string; contentBase64?: string; message: string; sha?: string; context?: RepoContext }) {
  const context = params.context || getRepoContext();
  const suffix = `/contents/${encodePath(params.path)}`;
  return githubFetch<{ content: GitHubFile; commit: { sha: string; html_url: string } }>(repoApiPathFor(context, suffix), {
    method: 'PUT',
    body: JSON.stringify({
      message: params.message,
      content: params.contentBase64 || Buffer.from(params.content || '', 'utf8').toString('base64'),
      branch: branchFor(context),
      sha: params.sha
    })
  });
}

async function getHeadRef(context: RepoContext) {
  let branch = branchFor(context);
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const refPath = `/git/ref/heads/${encodeURIComponent(branch)}`;
      const ref = await githubFetch<{ object: { sha: string } }>(repoApiPathFor(context, refPath));
      return { branch, refPath, ref };
    } catch (error) {
      lastError = error;
      if (!isNotFound(error)) throw error;

      const repo = await getRepository(context).catch(() => null);
      if (repo?.default_branch && repo.default_branch !== branch) {
        branch = repo.default_branch;
      } else {
        await sleep(750 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export async function putFiles(params: { files: Array<{ path: string; content: string }>; message: string; context?: RepoContext }) {
  if (!params.files.length) return null;
  const context = params.context || getRepoContext();
  const repoPath = (suffix: string) => repoApiPathFor(context, suffix);
  const { refPath, ref } = await getHeadRef(context);
  const baseCommit = await githubFetch<{ tree: { sha: string } }>(repoPath(`/git/commits/${ref.object.sha}`));
  const tree = await githubFetch<{ sha: string }>(repoPath('/git/trees'), {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: params.files.map((file) => ({
        path: assertSafeRepoPath(file.path),
        mode: '100644',
        type: 'blob',
        content: file.content
      }))
    })
  });
  const commit = await githubFetch<{ sha: string; html_url: string }>(repoPath('/git/commits'), {
    method: 'POST',
    body: JSON.stringify({ message: params.message, tree: tree.sha, parents: [ref.object.sha] })
  });
  await githubFetch(repoPath(refPath), {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha })
  });
  return { commit };
}

export async function deleteFile(params: { path: string; sha: string; message: string }) {
  const context = getRepoContext();
  return githubFetch<{ commit: { sha: string; html_url: string } }>(repoApiPathFor(context, `/contents/${encodePath(params.path)}`), {
    method: 'DELETE',
    body: JSON.stringify({ message: params.message, sha: params.sha, branch: branchFor(context) })
  });
}

export async function listRecentCommits(): Promise<GitHubCommit[]> {
  const context = getRepoContext();
  return githubFetch<GitHubCommit[]>(repoApiPathFor(context, `/commits?sha=${encodeURIComponent(branchFor(context))}&per_page=10`));
}

export async function listWorkflowRuns(workflow?: GitHubWorkflow): Promise<WorkflowRun[]> {
  const context = getRepoContext();
  const suffix = workflow ? `/actions/workflows/${workflow.id}/runs` : '/actions/runs';
  const result = await githubFetch<{ workflow_runs: WorkflowRun[] }>(repoApiPathFor(context, `${suffix}?branch=${encodeURIComponent(branchFor(context))}&per_page=10`));
  return result.workflow_runs;
}

export async function listWorkflows(): Promise<GitHubWorkflow[]> {
  const result = await githubFetch<{ workflows: GitHubWorkflow[] }>(repoApiPath('/actions/workflows?per_page=100'));
  return result.workflows;
}

export async function resolvePublishWorkflow(): Promise<GitHubWorkflow> {
  const config = getConfig();
  const workflows = await listWorkflows();
  if (!workflows.length) {
    throw new Error('当前仓库没有 GitHub Actions workflow。请先在仓库中添加发布 workflow，或用“仓库”页的“补全当前仓库”。');
  }

  if (config.GITHUB_WORKFLOW_ID) {
    const configured = workflows.find((workflow) =>
      String(workflow.id) === config.GITHUB_WORKFLOW_ID ||
      workflow.path.endsWith(`/${config.GITHUB_WORKFLOW_ID}`) ||
      workflow.name === config.GITHUB_WORKFLOW_ID
    );
    if (!configured) {
      throw new Error(`找不到配置的发布 workflow：${config.GITHUB_WORKFLOW_ID}`);
    }
    return configured;
  }

  const preferredNames = ['pages.yml', 'pages.yaml', 'deploy.yml', 'deploy.yaml', 'gh-pages.yml', 'gh-pages.yaml'];
  const preferred = workflows.find((workflow) => preferredNames.some((name) => workflow.path.endsWith(`/${name}`)));
  return preferred || workflows[0];
}

export async function dispatchWorkflow() {
  const context = getRepoContext();
  const workflow = await resolvePublishWorkflow();
  const [runs, commits] = await Promise.all([listWorkflowRuns(workflow).catch(() => []), listRecentCommits().catch(() => [])]);
  const activeRun = runs.find((run) => run.status === 'queued' || run.status === 'in_progress' || run.status === 'waiting' || run.status === 'requested');
  if (activeRun) {
    throw new Error('发布 workflow 已在运行中，请等待当前发布完成后再手动触发。');
  }
  const latestCommit = commits[0];
  const latestRun = runs[0];
  if (latestCommit && latestRun?.head_sha === latestCommit.sha && latestRun.status === 'completed' && latestRun.conclusion === 'success') {
    throw new Error('当前最新提交已经发布成功，无需重复触发。');
  }
  await githubFetch<void>(repoApiPathFor(context, `/actions/workflows/${workflow.id}/dispatches`), {
    method: 'POST',
    body: JSON.stringify({ ref: branchFor(context) })
  });
  return workflow;
}
