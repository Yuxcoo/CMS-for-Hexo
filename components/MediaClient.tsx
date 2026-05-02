'use client';

import { useEffect, useState } from 'react';
import { Copy, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type MediaItem = { name: string; path: string; sha: string; size: number; url: string; previewUrl?: string; markdown: string };

export function MediaClient() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch('/api/media');
    const result = await response.json();
    setItems(result.media || []);
  }

  async function upload(file: File) {
    setBusy(true);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    const contentBase64 = dataUrl.split(',')[1];
    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, mimeType: file.type, contentBase64 })
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `已上传：${result.markdown}` : result.error || '上传失败');
    load();
  }

  async function remove(item: MediaItem) {
    if (!confirm('确认删除图片？')) return;
    await fetch('/api/media', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: item.path, sha: item.sha }) });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-6">
      <section className="apple-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-[28px] font-semibold leading-[1.14] tracking-[-0.28px] text-ink">图片库</h2>
          <p className="mt-2 text-[17px] leading-[1.47] tracking-[-0.374px] text-muted">上传后可直接复制 Markdown 引用。</p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-blue px-[22px] py-[11px] text-[17px] font-normal leading-none tracking-[-0.374px] text-white transition hover:bg-blueFocus active:scale-95">
          <Upload size={17} /> 上传图片
          <input className="hidden" type="file" accept="image/*" disabled={busy} onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        </label>
      </section>
      {message ? <p className="apple-message break-all">{message}</p> : null}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.path} className="overflow-hidden rounded-[18px] border border-line bg-canvas">
            <div className="grid aspect-square place-items-center bg-paper p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl || item.url} alt={item.name} className="max-h-full max-w-full object-contain shadow-product" />
            </div>
            <div className="grid gap-2 p-5">
              <div className="truncate text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-ink">{item.name}</div>
              <div className="truncate text-[12px] leading-none tracking-[-0.12px] text-muted">{item.path}</div>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" className="min-h-10 px-4 py-2 text-[14px]" onClick={() => navigator.clipboard.writeText(item.markdown)}><Copy size={16} /></Button>
                <Button variant="danger" className="min-h-10 px-4 py-2 text-[14px]" onClick={() => remove(item)}><Trash2 size={16} /></Button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
