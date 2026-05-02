'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Image, Loader2, PanelTop, Search, ScrollText, X } from 'lucide-react';
import { TextInput } from '@/components/ui/Field';

type SearchItem = {
  href: string;
  title: string;
  description: string;
  type: 'post' | 'draft' | 'page' | 'media';
};

const typeMeta = {
  post: { label: '文章', icon: FileText },
  draft: { label: '草稿', icon: ScrollText },
  page: { label: '页面', icon: PanelTop },
  media: { label: '图片', icon: Image }
};

function text(value: unknown) {
  return String(value || '');
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch('/api/posts').then((response) => response.json()).catch(() => ({})),
      fetch('/api/drafts').then((response) => response.json()).catch(() => ({})),
      fetch('/api/pages').then((response) => response.json()).catch(() => ({})),
      fetch('/api/media').then((response) => response.json()).catch(() => ({}))
    ]).then(([postsData, draftsData, pagesData, mediaData]) => {
      if (cancelled) return;
      const next: SearchItem[] = [
        ...(postsData.posts || []).map((post: any) => ({
          type: 'post' as const,
          href: '/posts',
          title: text(post.meta?.title || post.name),
          description: text(post.meta?.permalink || post.path)
        })),
        ...(draftsData.drafts || []).map((draft: any) => ({
          type: 'draft' as const,
          href: '/drafts',
          title: text(draft.meta?.title || draft.name),
          description: text(draft.meta?.permalink || draft.path)
        })),
        ...(pagesData.pages || []).map((page: any) => ({
          type: 'page' as const,
          href: '/pages',
          title: text(page.title || page.slug),
          description: text(page.url || page.path)
        })),
        ...(mediaData.media || []).map((media: any) => ({
          type: 'media' as const,
          href: '/media',
          title: text(media.name),
          description: text(media.path)
        }))
      ];
      setItems(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, 12);
    return items.filter((item) => `${item.title} ${item.description} ${typeMeta[item.type].label}`.toLowerCase().includes(needle)).slice(0, 30);
  }, [items, query]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden min-h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] leading-none tracking-[-0.12px] text-white/78 transition hover:bg-white/10 hover:text-white sm:inline-flex">
        <Search size={15} /> 搜索
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/45 px-4 py-16 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto max-w-2xl overflow-hidden rounded-[14px] border border-line bg-canvas text-ink" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-line p-3">
              <Search size={17} className="text-muted" />
              <TextInput ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章、草稿、页面、图片" className="min-h-9 flex-1 border-0 bg-transparent px-0 py-1 focus:ring-0" />
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-paper hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[58vh] overflow-auto p-2">
              {loading ? <div className="flex items-center gap-2 px-3 py-6 text-[14px] text-muted"><Loader2 size={16} className="animate-spin" />正在载入内容...</div> : null}
              {!loading && !results.length ? <div className="px-3 py-6 text-[14px] text-muted">没有找到匹配内容。</div> : null}
              {results.map((item, index) => {
                const Icon = typeMeta[item.type].icon;
                return (
                  <Link key={`${item.type}-${item.description}-${index}`} href={item.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-[10px] px-3 py-2.5 transition hover:bg-paper">
                    <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-paper text-blue"><Icon size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold leading-[1.25] text-ink">{item.title || '未命名'}</span>
                        <span className="shrink-0 rounded-full bg-paper px-2 py-1 text-[11px] leading-none text-muted">{typeMeta[item.type].label}</span>
                      </span>
                      <span className="mt-1 block truncate text-[12px] leading-none text-muted">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
