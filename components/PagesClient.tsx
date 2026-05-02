'use client';

import { useEffect, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';

type PageSummary = {
  title: string;
  slug: string;
  path: string;
  url: string;
  sha: string;
};

type PageDetail = PageSummary & { body: string };

const emptyPage: PageDetail = { title: '', slug: '', path: '', url: '', sha: '', body: '' };

export function PagesClient() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [active, setActive] = useState<PageDetail>(emptyPage);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function loadList() {
    setBusy(true);
    const response = await fetch('/api/pages');
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '加载页面失败');
      return;
    }
    setPages(result.pages || []);
  }

  async function select(page: PageSummary) {
    setBusy(true);
    setMessage(`正在加载页面：${page.title}...`);
    const response = await fetch(`/api/pages?path=${encodeURIComponent(page.path)}`);
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '加载页面失败');
      return;
    }
    setActive(result.page);
    setMessage('');
  }

  function createNew() {
    setActive({ ...emptyPage, title: 'About', slug: 'about' });
    setMessage('');
  }

  async function save() {
    if (!active.title.trim()) {
      setMessage('页面标题不能为空');
      return;
    }
    setBusy(true);
    setMessage(active.path ? '正在保存页面并更新导航...' : '正在创建页面并更新导航...');
    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: active.title, slug: active.slug, menuLabel: active.title, body: active.body, path: active.path || undefined, sha: active.sha || undefined })
      });
      const result = await response.json();
      setBusy(false);
      if (!response.ok) {
        setMessage(result.error || '保存失败');
        return;
      }
      setActive((current) => ({ ...current, path: result.path, url: result.url, sha: result.sha }));
      setMessage(`已保存页面 ${result.path}，并写入导航 ${result.menuLabel} -> ${result.url}`);
      loadList();
    } catch {
      setBusy(false);
      setMessage('保存失败，请稍后重试');
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-lg border border-line bg-white shadow-panel">
        <div className="flex items-center justify-between gap-3 border-b border-line p-3">
          <h2 className="font-bold">页面</h2>
          <Button variant="secondary" onClick={createNew} disabled={busy}><Plus size={17} />新增</Button>
        </div>
        <div className="max-h-[720px] overflow-auto p-2">
          {!pages.length ? <p className="rounded-md bg-[#f4f6f4] px-3 py-2 text-sm text-[#68746c]">还没有独立页面。</p> : null}
          {pages.map((page) => (
            <button key={page.path} onClick={() => select(page)} className={`mb-2 block w-full rounded-md p-3 text-left text-sm hover:bg-[#f1f4f1] ${active.path === page.path ? 'bg-[#e7eee8]' : ''}`}>
              <div className="font-semibold">{page.title}</div>
              <div className="mt-1 truncate text-xs text-[#68746c]">{page.url}</div>
            </button>
          ))}
        </div>
      </aside>
      <section className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="页面标题">
            <TextInput value={active.title} onChange={(event) => setActive((current) => ({ ...current, title: event.target.value }))} placeholder="About" />
          </Field>
          <Field label="页面路径">
            <TextInput value={active.slug} onChange={(event) => setActive((current) => ({ ...current, slug: event.target.value }))} placeholder="about" disabled={Boolean(active.path)} />
          </Field>
        </div>
        <Field label="页面正文 Markdown">
          <TextArea value={active.body} onChange={(event) => setActive((current) => ({ ...current, body: event.target.value }))} className="min-h-[520px] font-mono" placeholder="写一些页面内容..." />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={busy || !active.title.trim()}><Save size={17} />{busy ? '保存中...' : '保存页面并更新导航'}</Button>
          {active.url ? <span className="text-sm text-[#68746c]">页面地址：{active.url}</span> : null}
        </div>
        {message ? <p className="break-all rounded-md bg-[#eef2ee] px-3 py-2 text-sm text-ink">{message}</p> : null}
      </section>
    </div>
  );
}
