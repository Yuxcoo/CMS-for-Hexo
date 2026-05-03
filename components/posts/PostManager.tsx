'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostEditor, PostList } from './PostEditor';
import type { PostContent, PostKind, PostSummary } from '@/types/post';

export function PostManager({ kind }: { kind: PostKind }) {
  const [items, setItems] = useState<PostSummary[]>([]);
  const [active, setActive] = useState<PostContent | undefined>();
  const [loading, setLoading] = useState(true);
  const endpoint = kind === 'post' ? '/api/posts' : '/api/drafts';

  const loadList = useCallback(async () => {
    setLoading(true);
    const response = await fetch(endpoint);
    const result = await response.json();
    setItems(kind === 'post' ? result.posts || [] : result.drafts || []);
    setLoading(false);
  }, [endpoint, kind]);

  async function select(post: PostSummary) {
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

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        {loading ? <div className="apple-message">加载中...</div> : <PostList posts={items} activePath={active?.path} kind={kind} onSelect={select} onReorder={reorder} onOrderMeta={updateOrderMeta} />}
      </div>
      <PostEditor kind={kind} initial={active} onSaved={loadList} onDeleted={() => { setActive(undefined); loadList(); }} />
    </div>
  );
}
