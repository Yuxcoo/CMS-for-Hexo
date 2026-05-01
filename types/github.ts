export type GitHubFile = {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | string;
  download_url?: string | null;
};

export type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: {
      name?: string;
      date?: string;
    };
  };
};

export type WorkflowRun = {
  id: number;
  name?: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
};
