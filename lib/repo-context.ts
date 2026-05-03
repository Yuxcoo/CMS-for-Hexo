import { cookies } from 'next/headers';
import { getConfig } from './config';

const REPO_COOKIE = 'cms_for_hexo_repo';
const REPO_MAX_AGE = 60 * 60 * 24 * 365;

export type RepoContext = {
  owner: string;
  repo: string;
  branch?: string;
};

export function encodeRepoContext(context: RepoContext): string {
  return Buffer.from(JSON.stringify(context)).toString('base64url');
}

export function decodeRepoContext(value?: string): RepoContext | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as RepoContext;
    if (!parsed.owner || !parsed.repo) return null;
    return { owner: parsed.owner, repo: parsed.repo, branch: parsed.branch };
  } catch {
    return null;
  }
}

export function getRepoContext(): RepoContext {
  const fromCookie = decodeRepoContext(cookies().get(REPO_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  const config = getConfig();
  if (config.GITHUB_OWNER && config.GITHUB_REPO) return { owner: config.GITHUB_OWNER, repo: config.GITHUB_REPO, branch: config.GITHUB_BRANCH };
  throw new Error('No GitHub repository selected. Choose or create a repository in Repository Settings.');
}

export function getOptionalRepoContext(): RepoContext | null {
  try {
    return getRepoContext();
  } catch {
    return null;
  }
}

export function setRepoContext(context: RepoContext): void {
  cookies().set(REPO_COOKIE, encodeRepoContext(context), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REPO_MAX_AGE
  });
}
