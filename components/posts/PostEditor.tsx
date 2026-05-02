'use client';

import { useEffect, useMemo, useState } from 'react';
import { FilePenLine, Save, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { renderMarkdownPreview } from '@/lib/markdown-preview';
import type { PostContent, PostKind, PostMeta, PostSummary } from '@/types/post';

type Props = {
  kind: PostKind;
  initial?: PostContent;
  onSaved?: (post: { path: string; sha: string }) => void;
  onDeleted?: () => void;
};

const emptyMeta: PostMeta = {
  title: '',
  date: new Date().toISOString(),
  tags: [],
  categories: []
};

function arrayToText(value: string[]) {
  return value.join(', ');
}

function textToArray(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function PostEditor({ kind, initial, onSaved, onDeleted }: Props) {
  const [meta, setMeta] = useState<PostMeta>(initial?.meta || emptyMeta);
  const [body, setBody] = useState(initial?.body || '');
  const [path, setPath] = useState(initial?.path || '');
  const [sha, setSha] = useState(initial?.sha || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const preview = useMemo(() => renderMarkdownPreview(body || ''), [body]);

  useEffect(() => {
    if (!initial) return;
    setMeta(initial.meta);
    setBody(initial.body);
    setPath(initial.path);
    setSha(initial.sha);
  }, [initial]);

  function updateMeta(key: keyof PostMeta, value: PostMeta[keyof PostMeta]) {
    setMeta((current) => ({ ...current, [key]: value }));
  }

  async function save(targetKind: PostKind = kind) {
    if (!meta.title.trim()) {
      setMessage('标题不能为空');
      return;
    }
    setBusy(true);
    setMessage(targetKind === 'post' ? '正在保存并触发发布...' : '正在保存到草稿...');
    const endpoint = targetKind === 'post' ? '/api/posts' : '/api/drafts';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: targetKind, meta, body, path: targetKind === kind ? path || undefined : undefined, originalPath: targetKind === kind ? initial?.path : undefined, sha: targetKind === kind ? sha || undefined : undefined })
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '保存失败');
      return;
    }
    setPath(result.path);
    setSha(result.sha);
    setMessage(`${targetKind === 'post' ? '已保存，GitHub Actions 将自动发布' : '已保存至草稿'}：${result.commit?.sha?.slice(0, 7) || result.sha.slice(0, 7)}`);
    onSaved?.({ path: result.path, sha: result.sha });
  }

  async function remove() {
    if (!path || !sha || !confirm('确认删除这篇内容？')) return;
    setBusy(true);
    const response = await fetch(kind === 'post' ? '/api/posts' : '/api/drafts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, sha })
    });
    setBusy(false);
    if (!response.ok) {
      const result = await response.json();
      setMessage(result.error || '删除失败');
      return;
    }
    onDeleted?.();
  }

  async function publishDraft() {
    if (!path) return;
    setBusy(true);
    setMessage('正在发布草稿...');
    const response = await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, action: 'publish' })
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `已发布：${result.path}` : result.error || '发布失败');
  }

  async function moveToDraft() {
    if (!path || !confirm('确认把这篇文章转为草稿？')) return;
    setBusy(true);
    setMessage('正在转为草稿...');
    const response = await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, action: 'unpublish' })
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `已转为草稿：${result.path}` : result.error || '操作失败');
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="grid gap-4">
          <Field label="标题">
            <TextInput value={meta.title} onChange={(event) => updateMeta('title', event.target.value)} placeholder="我的新文章" />
          </Field>
          <Field label="仓库路径">
            <TextInput value={path} onChange={(event) => setPath(event.target.value)} placeholder={kind === 'post' ? 'source/_posts/my-post.md' : 'source/_drafts/my-draft.md'} />
          </Field>
          <Field label="发布日期">
            <TextInput value={meta.date || ''} onChange={(event) => updateMeta('date', event.target.value)} placeholder="2026-05-01T10:00:00.000Z" />
          </Field>
          <Field label="标签，逗号分隔">
            <TextInput value={arrayToText(meta.tags)} onChange={(event) => updateMeta('tags', textToArray(event.target.value))} />
          </Field>
          <Field label="分类，逗号分隔">
            <TextInput value={arrayToText(meta.categories)} onChange={(event) => updateMeta('categories', textToArray(event.target.value))} />
          </Field>
          <Field label="摘要">
            <TextArea value={String(meta.excerpt || '')} onChange={(event) => updateMeta('excerpt', event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save()} disabled={busy}><Save size={17} />{busy ? '保存中...' : '保存'}</Button>
            {kind === 'post' && !path ? <Button variant="secondary" onClick={() => save('draft')} disabled={busy}><FilePenLine size={17} />保存至草稿</Button> : null}
            {kind === 'draft' && path ? <Button variant="secondary" onClick={publishDraft} disabled={busy}><UploadCloud size={17} />发布</Button> : null}
            {kind === 'post' && path ? <Button variant="secondary" onClick={moveToDraft} disabled={busy}><UploadCloud size={17} />转草稿</Button> : null}
            {path ? <Button variant="danger" onClick={remove} disabled={busy}><Trash2 size={17} />删除</Button> : null}
          </div>
          {message ? <p className="rounded-md bg-[#eef2ee] px-3 py-2 text-sm text-ink">{message}</p> : null}
        </div>
      </section>
      <section className="grid min-h-[680px] gap-4 lg:grid-cols-2">
        <TextArea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-[680px] font-mono" placeholder="在这里写 Markdown..." />
        <article className="prose-preview min-h-[680px] overflow-auto rounded-lg border border-line bg-white p-5 shadow-panel" dangerouslySetInnerHTML={{ __html: preview }} />
      </section>
    </div>
  );
}

export function PostList({ posts, activePath, onSelect }: { posts: PostSummary[]; activePath?: string; onSelect: (post: PostSummary) => void }) {
  const [query, setQuery] = useState('');
  const filtered = posts.filter((post) => `${post.meta.title} ${post.path} ${post.meta.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <aside className="rounded-lg border border-line bg-white shadow-panel">
      <div className="border-b border-line p-3">
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、路径、标签" />
      </div>
      <div className="max-h-[720px] overflow-auto p-2">
        {filtered.map((post) => (
          <button key={post.path} onClick={() => onSelect(post)} className={`mb-2 block w-full rounded-md p-3 text-left text-sm hover:bg-[#f1f4f1] ${activePath === post.path ? 'bg-[#e7eee8]' : ''}`}>
            <div className="font-semibold">{post.meta.title}</div>
            <div className="mt-1 truncate text-xs text-[#68746c]">{post.path}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
