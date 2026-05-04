'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostEditor, PostList } from './PostEditor';
import type { PostContent, PostKind, PostSummary } from '@/types/post';

export function PostManager({ kind }: { kind: PostKind }) {
  const [items, setItems] = useState<PostSummary[]>([]);
  const [active, setActive] = useState<PostContent | undefined>();
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [draftSaver, setDraftSaver] = useState<(() => Promise<boolean>) | null>(null);
  const endpoint = kind === 'post' ? '/api/posts' : '/api/drafts';

  const loadList = useCallback(async () => {
    setLoading(true);
    const response = await fetch(endpoint);
    const result = await response.json();
    setItems(kind === 'post' ? result.posts || [] : result.drafts || []);
    setLoading(false);
  }, [endpoint, kind]);

  const confirmLeaveWithDraftSave = useCallback(async () => {
    if (!dirty) return true;
    const shouldSave = confirm('当前文章有未保存内容，是否先保存为草稿？\n选择“确定”会先保存草稿再继续，选择“取消”则留在当前页面。');
    if (!shouldSave) return false;
    return (await draftSaver?.()) ?? false;
  }, [dirty, draftSaver]);

  async function select(post: PostSummary) {
    if (active?.path === post.path) return;
    const allowed = await confirmLeaveWithDraftSave();
    if (!allowed) return;
    const contentEndpoint = kind === 'post' ? `/api/posts/content?path=${encodeURIComponent(post.path)}` : `/api/drafts?path=${encodeURIComponent(post.path)}`;
    const response = await fetch(contentEndpoint);
    const result = await response.json();
    setActive(kind === 'post' ? result.post : result.draft);
  }

  async function reorder(paths: string[]) {
    const nextItems = paths.map((path) => items.find((item) => item.path === path)).filter((item): item is PostSummary => Boolean(item));
    setItems(nextItems.map((item, index) => ({ ...item, meta: { ...item.meta, priority: (nextItems.length - index) * 10 } })));
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', paths })
    });
    if (!response.ok) loadList();
  }

  async function updateOrderMeta(post: PostSummary, meta: { priority?: number; sticky?: boolean; save?: boolean }) {
    const { save = true, ...frontMatter } = meta;
    setItems((current) => current.map((item) => item.path === post.path ? { ...item, meta: { ...item.meta, ...frontMatter } } : item));
    if (active?.path === post.path) setActive((current) => current ? { ...current, meta: { ...current.meta, ...frontMatter } } : current);
    if (!save) return;
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'order-meta', path: post.path, ...frontMatter })
    });
    if (!response.ok) loadList();
  }

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }

    async function handleDocumentClick(event: MouseEvent) {
      if (!dirty) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      const allowed = await confirmLeaveWithDraftSave();
      if (allowed) window.location.assign(url.toString());
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [confirmLeaveWithDraftSave, dirty]);

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        {loading ? <div className="apple-message">加载中...</div> : <PostList posts={items} activePath={active?.path} kind={kind} onSelect={select} onReorder={reorder} onOrderMeta={updateOrderMeta} />}
      </div>
      <PostEditor kind={kind} initial={active} onSaved={loadList} onDeleted={() => { setActive(undefined); loadList(); }} onDirtyChange={setDirty} registerDraftSaver={setDraftSaver} />
    </div>
  );
}
