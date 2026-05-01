'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, Clock3, ExternalLink, RefreshCw, Rocket, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { GitHubCommit, WorkflowRun } from '@/types/github';

function statusLabel(run: WorkflowRun) {
  if (run.status !== 'completed') return '发布中';
  if (run.conclusion === 'success') return '发布成功';
  if (run.conclusion === 'failure') return '发布失败';
  return run.conclusion || '已完成';
}

function StatusIcon({ run }: { run: WorkflowRun }) {
  if (run.status !== 'completed') return <CircleDashed size={18} className="text-sky" />;
  if (run.conclusion === 'success') return <CheckCircle2 size={18} className="text-moss" />;
  return <XCircle size={18} className="text-coral" />;
}

export function PublishClient() {
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
    setMessage(response.ok ? '已开始发布，稍后刷新查看结果。' : result.error || '发布失败');
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">发布中心</h2>
            <p className="mt-1 text-sm text-[#68746c]">保存文章会自动提交到仓库；这里可以手动触发一次完整发布，并查看最近发布结果。</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load}><RefreshCw size={17} />刷新</Button>
            <Button onClick={dispatch}><Rocket size={17} />立即发布</Button>
          </div>
        </div>
        {message ? <p className="mb-3 rounded-md bg-[#eef2ee] px-3 py-2 text-sm">{message}</p> : null}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
          <h2 className="mb-4 text-lg font-bold">发布记录</h2>
          <div className="grid gap-2">
            {runs.map((run) => (
              <a key={run.id} href={run.html_url} target="_blank" className="flex items-start gap-3 rounded-md border border-line p-3 text-sm hover:border-moss">
                <StatusIcon run={run} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{statusLabel(run)}</span>
                    <ExternalLink size={15} className="text-[#68746c]" />
                  </div>
                  <div className="mt-1 truncate text-[#68746c]">{run.name || 'GitHub Actions'} / {run.head_branch}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[#68746c]"><Clock3 size={13} />{new Date(run.updated_at).toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
          <h2 className="mb-4 text-lg font-bold">最近提交</h2>
          <div className="grid gap-2">
            {commits.map((commit) => (
              <a key={commit.sha} href={commit.html_url} target="_blank" className="rounded-md border border-line p-3 text-sm hover:border-moss">
                <div className="font-semibold">{commit.commit.message}</div>
                <div className="mt-1 text-[#68746c]">{commit.sha.slice(0, 7)} / {commit.commit.author?.date ? new Date(commit.commit.author.date).toLocaleString() : '-'}</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
