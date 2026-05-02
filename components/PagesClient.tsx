'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';

export function PagesClient() {
  const [title, setTitle] = useState('About');
  const [slug, setSlug] = useState('about');
  const [menuLabel, setMenuLabel] = useState('About');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function create() {
    if (!title.trim()) {
      setMessage('页面标题不能为空');
      return;
    }
    setBusy(true);
    setMessage('正在创建页面并更新博客导航...');
    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, menuLabel, body })
      });
      const result = await response.json();
      setBusy(false);
      if (!response.ok) {
        setMessage(result.error || '创建失败');
        return;
      }
      setMessage(`已创建页面 ${result.path}，并加入导航 ${result.menuLabel} -> ${result.url}`);
    } catch {
      setBusy(false);
      setMessage('创建失败，请稍后重试');
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="grid gap-4">
          <Field label="页面标题">
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="About" />
          </Field>
          <Field label="页面路径">
            <TextInput value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="about" />
          </Field>
          <Field label="导航显示名称">
            <TextInput value={menuLabel} onChange={(event) => setMenuLabel(event.target.value)} placeholder="About" />
          </Field>
          <Button onClick={create} disabled={busy || !title.trim()}><Plus size={17} />{busy ? '创建中...' : '创建页面并加入导航'}</Button>
          {message ? <p className="break-all rounded-md bg-[#eef2ee] px-3 py-2 text-sm text-ink">{message}</p> : null}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <Field label="页面正文 Markdown">
          <TextArea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-[520px] font-mono" placeholder="写一些页面内容..." />
        </Field>
      </section>
    </div>
  );
}
