'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check, GitBranch, Plus, RefreshCw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';

type Repository = {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
};

export function RepositoryClient() {
  const pathname = usePathname();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('Hexo blog content repository');
  const [isPrivate, setIsPrivate] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setMessage('正在加载可访问的 GitHub 仓库...');
    const response = await fetch('/api/repositories');
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '加载仓库失败');
      return;
    }
    setMessage('');
    setRepos(result.repositories || []);
    if (typeof result.viewerLogin === 'string' && result.viewerLogin.trim()) {
      setName((current) => current.trim() || `${result.viewerLogin}.github.io`);
    }
  }

  async function selectRepo(repo: Repository) {
    setBusy(true);
    setMessage(`正在连接：${repo.fullName}...`);
    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', owner: repo.owner, repo: repo.name, branch: repo.defaultBranch })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || '连接失败');
        setBusy(false);
        return;
      }
      setMessage(`已连接：${repo.fullName}，正在进入仪表盘...`);
      if (pathname === '/onboarding') {
        window.location.assign('/dashboard');
        return;
      }
      setBusy(false);
    } catch {
      setMessage('连接失败，请稍后重试');
      setBusy(false);
    }
  }

  async function createRepo() {
    setBusy(true);
    setMessage(`正在创建并初始化：${name}...`);
    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, description, private: isPrivate, initializeHexo: true })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || '创建失败');
        setBusy(false);
        return;
      }
      setMessage(`已创建并初始化：${result.repo.full_name}，正在进入仪表盘...`);
      if (pathname === '/onboarding') {
        window.location.assign('/dashboard');
        return;
      }
      setBusy(false);
      load();
    } catch {
      setMessage('创建失败，请稍后重试');
      setBusy(false);
    }
  }

  async function initializeCurrent() {
    setBusy(true);
    const response = await fetch('/api/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'initialize' })
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `初始化完成：${result.created.length ? result.created.join(', ') : '无需新增文件'}` : result.error || '初始化失败');
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = repos.filter((repo) => repo.fullName.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section className="apple-card">
        <h2 className="mb-4 font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.18px] text-ink">新建博客仓库</h2>
        <div className="grid gap-4">
          <Field label="仓库名">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="username.github.io" />
          </Field>
          <Field label="描述">
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <label className="flex min-h-10 items-center gap-3 text-[15px] leading-[1.45] tracking-[-0.18px] text-ink">
            <input className="h-5 w-5 accent-blue" type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} /> 私有仓库
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={createRepo} disabled={busy || !name.trim()}><Plus size={17} />{busy ? '处理中...' : '创建可发布博客'}</Button>
            <Button variant="secondary" onClick={initializeCurrent} disabled={busy}><Wand2 size={17} />补全当前仓库</Button>
          </div>
          {message ? <p className="apple-message break-all">{message}</p> : null}
        </div>
      </section>
      <section className="apple-panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.18px] text-ink">连接已有仓库</h2>
            <p className="mt-1 text-[15px] leading-[1.45] tracking-[-0.18px] text-muted">显示 token 可访问的 GitHub 仓库。</p>
          </div>
          <Button variant="secondary" onClick={load} disabled={busy}><RefreshCw size={17} />刷新</Button>
        </div>
        <div className="border-b border-line p-4">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 owner/repo" />
        </div>
        <div className="max-h-[620px] overflow-auto p-4">
          {!busy && !filtered.length ? <p className="apple-message text-muted">没有找到匹配的仓库。</p> : null}
          {filtered.map((repo) => (
            <article key={repo.fullName} className="mb-3 flex flex-col gap-4 rounded-[11px] border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[15px] font-semibold leading-[1.24] tracking-[-0.18px] text-ink">{repo.fullName}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px] leading-none tracking-[-0.12px] text-muted">
                  <span>{repo.private ? 'private' : 'public'}</span>
                  <span className="inline-flex items-center gap-1"><GitBranch size={13} />{repo.defaultBranch}</span>
                </div>
              </div>
              <Button variant="secondary" className="min-h-10 px-4 py-2 text-[14px]" onClick={() => selectRepo(repo)} disabled={busy}><Check size={17} />{busy ? '请稍候' : '连接'}</Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
