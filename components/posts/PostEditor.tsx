'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FilePenLine, GripVertical, Pin, PinOff, Save, Trash2, UploadCloud } from 'lucide-react';
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
  categories: [],
  permalink: '',
  priority: 0,
  sticky: false
};

function arrayToText(value: string[]) {
  return value.join(', ');
}

function textToArray(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function cleanMeta(meta: PostMeta): PostMeta {
  const next = { ...meta };
  if (!String(next.permalink || '').trim()) delete next.permalink;
  if (!Number.isFinite(Number(next.priority))) delete next.priority;
  if (!next.sticky) delete next.sticky;
  return next;
}

export function PostEditor({ kind, initial, onSaved, onDeleted }: Props) {
  const [meta, setMeta] = useState<PostMeta>(initial?.meta || emptyMeta);
  const [body, setBody] = useState(initial?.body || '');
  const [path, setPath] = useState(initial?.path || '');
  const [sha, setSha] = useState(initial?.sha || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showMeta, setShowMeta] = useState(false);
  const preview = useMemo(() => renderMarkdownPreview(body || ''), [body]);

  useEffect(() => {
    if (!initial) return;
    setMeta({ ...initial.meta, permalink: String(initial.meta.permalink || ''), priority: Number(initial.meta.priority || 0), sticky: Boolean(initial.meta.sticky) });
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
      body: JSON.stringify({ kind: targetKind, meta: cleanMeta(meta), body, path: targetKind === kind ? path || undefined : undefined, originalPath: targetKind === kind ? initial?.path : undefined, sha: targetKind === kind ? sha || undefined : undefined })
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
    <div className="grid min-w-0 gap-4">
      <section className="apple-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="truncate font-display text-[22px] font-semibold leading-[1.18] tracking-[-0.2px] text-ink">{meta.title || '未命名文章'}</h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-[1.3] tracking-[-0.12px] text-muted">
              <span>仓库：{path || '自动生成'}</span>
              <span>permalink：{meta.permalink || '按 Hexo 默认规则'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setShowMeta((current) => !current)}>
              {showMeta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              信息
            </Button>
            <Button onClick={() => save()} disabled={busy}><Save size={16} />{busy ? '保存中...' : '保存'}</Button>
            {kind === 'post' && !path ? <Button variant="secondary" onClick={() => save('draft')} disabled={busy}><FilePenLine size={16} />保存至草稿</Button> : null}
            {kind === 'draft' && path ? <Button variant="secondary" onClick={publishDraft} disabled={busy}><UploadCloud size={16} />发布</Button> : null}
            {kind === 'post' && path ? <Button variant="secondary" onClick={moveToDraft} disabled={busy}><UploadCloud size={16} />转草稿</Button> : null}
            {path ? <Button variant="danger" onClick={remove} disabled={busy}><Trash2 size={16} />删除</Button> : null}
          </div>
        </div>
        {showMeta ? (
          <div className="grid gap-3 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="标题">
              <TextInput value={meta.title} onChange={(event) => updateMeta('title', event.target.value)} placeholder="我的新文章" />
            </Field>
            <Field label="仓库路径">
              <TextInput value={path} onChange={(event) => setPath(event.target.value)} placeholder={kind === 'post' ? 'source/_posts/my-post.md' : 'source/_drafts/my-draft.md'} />
            </Field>
            <Field label="permalink">
              <TextInput value={String(meta.permalink || '')} onChange={(event) => updateMeta('permalink', event.target.value)} placeholder="posts/my-custom-url/" />
            </Field>
            <Field label="发布日期">
              <TextInput value={meta.date || ''} onChange={(event) => updateMeta('date', event.target.value)} placeholder="2026-05-01T10:00:00.000Z" />
            </Field>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,1.15fr)]">
              <div className="grid gap-3 md:grid-cols-2 xl:col-span-2 xl:grid-cols-2">
                <Field label="标签">
                  <TextInput value={arrayToText(meta.tags)} onChange={(event) => updateMeta('tags', textToArray(event.target.value))} placeholder="逗号分隔" />
                </Field>
                <Field label="分类">
                  <TextInput value={arrayToText(meta.categories)} onChange={(event) => updateMeta('categories', textToArray(event.target.value))} placeholder="逗号分隔" />
                </Field>
                <Field label="priority">
                  <TextInput type="number" value={Number(meta.priority || 0)} onChange={(event) => updateMeta('priority', Number(event.target.value || 0))} />
                </Field>
                <label className="grid content-start items-start gap-1 self-start text-[13px] font-semibold leading-[1.3] tracking-[-0.12px] text-ink">
                  <span>置顶</span>
                  <button type="button" onClick={() => updateMeta('sticky', !meta.sticky)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-[14px] font-normal transition active:scale-95 ${meta.sticky ? 'border-blue bg-blue text-white' : 'border-line bg-canvas text-ink hover:border-blue'}`}>
                    {meta.sticky ? <Pin size={15} /> : <PinOff size={15} />}
                    {meta.sticky ? '已置顶' : '未置顶'}
                  </button>
                </label>
              </div>
              <Field label="摘要" className="xl:self-stretch">
                <TextArea value={String(meta.excerpt || '')} onChange={(event) => updateMeta('excerpt', event.target.value)} className="min-h-[132px] xl:min-h-[141px]" />
              </Field>
            </div>
          </div>
        ) : null}
        {message ? <p className="mx-4 mb-4 apple-message break-all">{message}</p> : null}
      </section>
      <section className="grid min-h-[620px] gap-4 xl:grid-cols-2">
        <TextArea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-[620px] rounded-[14px] font-mono text-[14px] tracking-normal" placeholder="在这里写 Markdown..." />
        <article className="prose-preview min-h-[620px] overflow-auto rounded-[14px] border border-line bg-canvas p-4" dangerouslySetInnerHTML={{ __html: preview }} />
      </section>
    </div>
  );
}

export function PostList({ posts, activePath, kind, onSelect, onReorder, onOrderMeta }: { posts: PostSummary[]; activePath?: string; kind: PostKind; onSelect: (post: PostSummary) => void; onReorder: (paths: string[]) => void; onOrderMeta: (post: PostSummary, meta: { priority?: number; sticky?: boolean; save?: boolean }) => void }) {
  const [query, setQuery] = useState('');
  const [dragPath, setDragPath] = useState<string | null>(null);
  const filtered = posts.filter((post) => `${post.meta.title} ${post.path} ${post.meta.permalink || ''} ${post.meta.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  function moveBefore(targetPath: string) {
    if (!dragPath || dragPath === targetPath || query.trim()) return;
    const next = posts.filter((post) => post.path !== dragPath);
    const targetIndex = next.findIndex((post) => post.path === targetPath);
    const dragged = posts.find((post) => post.path === dragPath);
    if (!dragged || targetIndex < 0) return;
    next.splice(targetIndex, 0, dragged);
    onReorder(next.map((post) => post.path));
  }

  return (
    <aside className="apple-panel overflow-hidden xl:sticky xl:top-[104px]">
      <div className="border-b border-line p-3">
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、路径、标签" />
      </div>
      <div className="max-h-[calc(100vh-190px)] overflow-auto p-2">
        {filtered.map((post) => (
          <div key={post.path} draggable={!query.trim()} onDragStart={() => setDragPath(post.path)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveBefore(post.path)} onDragEnd={() => setDragPath(null)} className={`mb-2 rounded-[10px] border p-2 transition hover:border-blue ${activePath === post.path ? 'border-blue bg-paper' : dragPath === post.path ? 'border-blue/50 bg-paper/70 opacity-70' : 'border-transparent hover:bg-paper'}`}>
            <div className="flex items-start gap-2">
              <button type="button" className="mt-0.5 grid h-7 w-7 shrink-0 cursor-grab place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label="拖动排序">
                <GripVertical size={15} />
              </button>
              <button type="button" onClick={() => onSelect(post)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  {post.meta.sticky ? <Pin size={13} className="shrink-0 text-blue" /> : null}
                  <span className="truncate text-[15px] font-semibold leading-[1.25] tracking-[-0.18px] text-ink">{post.meta.title}</span>
                </div>
                <div className="mt-1 truncate text-[12px] leading-none tracking-[-0.12px] text-muted">{post.meta.permalink || post.path}</div>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 pl-9">
              <input type="number" value={Number(post.meta.priority || 0)} onChange={(event) => {
                const priority = Number(event.target.value || 0);
                onOrderMeta(post, { priority, save: false });
              }} onBlur={(event) => onOrderMeta(post, { priority: Number(event.target.value || 0), save: true })} onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }} className="h-8 w-20 rounded-full border border-line bg-canvas px-3 text-[12px] text-ink outline-none focus:border-blueFocus focus:ring-2 focus:ring-blueFocus/20" aria-label="priority" />
              {kind === 'post' ? (
                <button type="button" onClick={() => onOrderMeta(post, { sticky: !post.meta.sticky })} className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] transition ${post.meta.sticky ? 'border-blue bg-blue text-white' : 'border-line bg-canvas text-muted hover:border-blue hover:text-ink'}`}>
                  {post.meta.sticky ? <Pin size={13} /> : <PinOff size={13} />}
                  置顶
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
