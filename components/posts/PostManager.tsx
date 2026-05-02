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

  useEffect(() => {
    loadList();
  }, [loadList]);

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <div>
        {loading ? <div className="apple-message">加载中...</div> : <PostList posts={items} activePath={active?.path} onSelect={select} />}
      </div>
      <PostEditor kind={kind} initial={active} onSaved={loadList} onDeleted={() => { setActive(undefined); loadList(); }} />
    </div>
  );
}
