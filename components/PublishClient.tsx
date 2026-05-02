'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, Clock3, ExternalLink, RefreshCw, Rocket, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { GitHubCommit, GitHubWorkflow, WorkflowRun } from '@/types/github';

function statusLabel(run: WorkflowRun) {
  if (run.status !== 'completed') return '发布中';
  if (run.conclusion === 'success') return '发布成功';
  if (run.conclusion === 'failure') return '发布失败';
  return run.conclusion || '已完成';
}

function StatusIcon({ run }: { run: WorkflowRun }) {
  if (run.status !== 'completed') return <CircleDashed size={18} className="text-blue" />;
  if (run.conclusion === 'success') return <CheckCircle2 size={18} className="text-success" />;
  return <XCircle size={18} className="text-danger" />;
}

export function PublishClient() {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [publishWorkflow, setPublishWorkflow] = useState<GitHubWorkflow | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/github/status');
    const result = await response.json();
    setCommits(result.commits || []);
    setRuns(result.runs || []);
    setPublishWorkflow(result.publishWorkflow || null);
  }

  async function dispatch() {
    const response = await fetch('/api/github/status', { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? `已开始发布：${result.workflow?.name || 'GitHub Actions'}` : result.error || '发布失败');
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-6">
      <section className="apple-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-display text-[34px] font-semibold leading-[1.2] tracking-[-0.374px] text-ink">发布中心</h2>
            <p className="mt-2 text-[17px] leading-[1.47] tracking-[-0.374px] text-muted">保存文章会自动提交到仓库；这里可以手动触发一次完整发布，并查看最近发布结果。</p>
            <p className="mt-2 text-[14px] leading-[1.29] tracking-[-0.224px] text-muted">当前发布流程：{publishWorkflow ? `${publishWorkflow.name} (${publishWorkflow.path})` : '未检测到可触发的 workflow'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={load}><RefreshCw size={17} />刷新</Button>
            <Button onClick={dispatch}><Rocket size={17} />立即发布</Button>
          </div>
        </div>
        {message ? <p className="apple-message mt-5">{message}</p> : null}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="apple-card">
          <h2 className="mb-5 font-display text-[28px] font-semibold leading-[1.14] tracking-[-0.28px] text-ink">发布记录</h2>
          <div className="grid gap-3">
            {runs.map((run) => (
              <a key={run.id} href={run.html_url} target="_blank" className="flex items-start gap-3 rounded-[11px] border border-line p-4 transition hover:border-blue">
                <StatusIcon run={run} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-ink">{statusLabel(run)}</span>
                    <ExternalLink size={15} className="text-muted" />
                  </div>
                  <div className="mt-1 truncate text-[14px] leading-[1.29] tracking-[-0.224px] text-muted">{run.name || 'GitHub Actions'} / {run.head_branch}</div>
                  <div className="mt-2 flex items-center gap-1 text-[12px] leading-none tracking-[-0.12px] text-muted"><Clock3 size={13} />{new Date(run.updated_at).toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
        <div className="apple-card">
          <h2 className="mb-5 font-display text-[28px] font-semibold leading-[1.14] tracking-[-0.28px] text-ink">最近提交</h2>
          <div className="grid gap-3">
            {commits.map((commit) => (
              <a key={commit.sha} href={commit.html_url} target="_blank" className="rounded-[11px] border border-line p-4 transition hover:border-blue">
                <div className="text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-ink">{commit.commit.message}</div>
                <div className="mt-2 text-[14px] leading-[1.29] tracking-[-0.224px] text-muted">{commit.sha.slice(0, 7)} / {commit.commit.author?.date ? new Date(commit.commit.author.date).toLocaleString() : '-'}</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
