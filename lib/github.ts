import { getConfig } from './config';
import { assertSafeRepoPath } from './paths';
import { getRepoContext, type RepoContext } from './repo-context';
import type { GitHubCommit, GitHubFile, GitHubWorkflow, WorkflowRun } from '@/types/github';

const apiBase = 'https://api.github.com';

function encodePath(path: string): string {
  if (!path) return '';
  return assertSafeRepoPath(path).split('/').map(encodeURIComponent).join('/');
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
  const context = getRepoContext();
  return repoApiPathFor(context, suffix);
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
    if (String(error).includes('404')) return false;
    throw error;
  }
}

export async function listDirectory(path: string): Promise<GitHubFile[]> {
  const config = getConfig();
  const encoded = encodePath(path);
  const contentsPath = encoded ? `/contents/${encoded}` : '/contents';
  const result = await githubFetch<GitHubFile | GitHubFile[]>(
    repoApiPath(`${contentsPath}?ref=${encodeURIComponent(config.GITHUB_BRANCH)}`)
  );
  return Array.isArray(result) ? result : [];
}

export async function getFile(path: string, context?: RepoContext): Promise<{ content: string; sha: string; path: string; name: string; size: number }> {
  const config = getConfig();
  const suffix = `/contents/${encodePath(path)}?ref=${encodeURIComponent(config.GITHUB_BRANCH)}`;
  const file = await githubFetch<GitHubFile & { content: string; encoding: string }>(
    context ? repoApiPathFor(context, suffix) : repoApiPath(suffix)
  );
  const content = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { content, sha: file.sha, path: file.path, name: file.name, size: file.size };
}

export async function putFile(params: { path: string; content?: string; contentBase64?: string; message: string; sha?: string; context?: RepoContext }) {
  const config = getConfig();
  const suffix = `/contents/${encodePath(params.path)}`;
  return githubFetch<{ content: GitHubFile; commit: { sha: string; html_url: string } }>(params.context ? repoApiPathFor(params.context, suffix) : repoApiPath(suffix), {
    method: 'PUT',
    body: JSON.stringify({
      message: params.message,
      content: params.contentBase64 || Buffer.from(params.content || '', 'utf8').toString('base64'),
      branch: config.GITHUB_BRANCH,
      sha: params.sha
    })
  });
}

export async function deleteFile(params: { path: string; sha: string; message: string }) {
  const config = getConfig();
  return githubFetch<{ commit: { sha: string; html_url: string } }>(repoApiPath(`/contents/${encodePath(params.path)}`), {
    method: 'DELETE',
    body: JSON.stringify({ message: params.message, sha: params.sha, branch: config.GITHUB_BRANCH })
  });
}

export async function listRecentCommits(): Promise<GitHubCommit[]> {
  const config = getConfig();
  return githubFetch<GitHubCommit[]>(repoApiPath(`/commits?sha=${encodeURIComponent(config.GITHUB_BRANCH)}&per_page=10`));
}

export async function listWorkflowRuns(): Promise<WorkflowRun[]> {
  const config = getConfig();
  const result = await githubFetch<{ workflow_runs: WorkflowRun[] }>(repoApiPath(`/actions/runs?branch=${encodeURIComponent(config.GITHUB_BRANCH)}&per_page=10`));
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
  const config = getConfig();
  const workflow = await resolvePublishWorkflow();
  await githubFetch<void>(repoApiPath(`/actions/workflows/${workflow.id}/dispatches`), {
    method: 'POST',
    body: JSON.stringify({ ref: config.GITHUB_BRANCH })
  });
  return workflow;
}
