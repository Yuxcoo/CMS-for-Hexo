'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('Hexo blog content repository');
  const [isPrivate, setIsPrivate] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const response = await fetch('/api/repositories');
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '加载仓库失败');
      return;
    }
    setRepos(result.repositories || []);
    if (typeof result.viewerLogin === 'string' && result.viewerLogin.trim()) {
      setName((current) => current.trim() || `${result.viewerLogin}.github.io`);
    }
  }

  async function selectRepo(repo: Repository) {
    const response = await fetch('/api/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'select', owner: repo.owner, repo: repo.name })
    });
    const result = await response.json();
    setMessage(response.ok ? `已连接：${repo.fullName}` : result.error || '连接失败');
    if (response.ok && pathname === '/onboarding') router.push('/dashboard');
  }

  async function createRepo() {
    setBusy(true);
    const response = await fetch('/api/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name, description, private: isPrivate, initializeHexo: true })
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `已创建并初始化：${result.repo.full_name}` : result.error || '创建失败');
    if (response.ok && pathname === '/onboarding') {
      router.push('/dashboard');
      return;
    }
    if (response.ok) load();
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
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <h2 className="mb-4 text-lg font-bold">新建博客仓库</h2>
        <div className="grid gap-4">
          <Field label="仓库名">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="username.github.io" />
          </Field>
          <Field label="描述">
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} /> 私有仓库
          </label>
          <Button onClick={createRepo} disabled={busy || !name.trim()}><Plus size={17} />创建可发布博客</Button>
          <Button variant="secondary" onClick={initializeCurrent} disabled={busy}><Wand2 size={17} />补全当前仓库</Button>
          {message ? <p className="break-all rounded-md bg-[#eef2ee] px-3 py-2 text-sm">{message}</p> : null}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white shadow-panel">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">连接已有仓库</h2>
            <p className="text-sm text-[#68746c]">显示 token 可访问的 GitHub 仓库。</p>
          </div>
          <Button variant="secondary" onClick={load} disabled={busy}><RefreshCw size={17} />刷新</Button>
        </div>
        <div className="border-b border-line p-4">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 owner/repo" />
        </div>
        <div className="max-h-[720px] overflow-auto p-3">
          {filtered.map((repo) => (
            <article key={repo.fullName} className="mb-3 flex flex-col gap-3 rounded-md border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{repo.fullName}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#68746c]">
                  <span>{repo.private ? 'private' : 'public'}</span>
                  <span className="inline-flex items-center gap-1"><GitBranch size={13} />{repo.defaultBranch}</span>
                </div>
              </div>
              <Button variant="secondary" onClick={() => selectRepo(repo)}><Check size={17} />连接</Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
