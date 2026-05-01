'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { GitHubCommit, WorkflowRun } from '@/types/github';

export function DeployClient() {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/github/status');
    const result = await response.json();
    setCommits(result.commits || []);
    setRuns(result.runs || []);
  }

  async function dispatch() {
    const response = await fetch('/api/github/status', { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? '已触发 GitHub Actions workflow' : result.error || '触发失败');
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Workflow Runs</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load}><RefreshCw size={17} /></Button>
            <Button onClick={dispatch}><Rocket size={17} />触发</Button>
          </div>
        </div>
        {message ? <p className="mb-3 rounded-md bg-[#eef2ee] px-3 py-2 text-sm">{message}</p> : null}
        <div className="grid gap-2">
          {runs.map((run) => (
            <a key={run.id} href={run.html_url} target="_blank" className="rounded-md border border-line p-3 text-sm hover:border-moss">
              <div className="font-semibold">{run.name || run.head_branch}</div>
              <div className="mt-1 text-[#68746c]">{run.status} / {run.conclusion || 'pending'} / {new Date(run.updated_at).toLocaleString()}</div>
            </a>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <h2 className="mb-4 text-lg font-bold">最近提交</h2>
        <div className="grid gap-2">
          {commits.map((commit) => (
            <a key={commit.sha} href={commit.html_url} target="_blank" className="rounded-md border border-line p-3 text-sm hover:border-moss">
              <div className="font-semibold">{commit.commit.message}</div>
              <div className="mt-1 text-[#68746c]">{commit.sha.slice(0, 7)} / {commit.commit.author?.date ? new Date(commit.commit.author.date).toLocaleString() : '-'}</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
