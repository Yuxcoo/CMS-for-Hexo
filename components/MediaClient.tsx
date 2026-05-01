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
    <div className="grid gap-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-medium text-white hover:bg-[#405d49]">
          <Upload size={17} /> 上传图片
          <input className="hidden" type="file" accept="image/*" disabled={busy} onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        </label>
        {message ? <p className="mt-3 break-all rounded-md bg-[#eef2ee] px-3 py-2 text-sm">{message}</p> : null}
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.path} className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
            <div className="grid aspect-video place-items-center bg-[#eef2ee]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl || item.url} alt={item.name} className="h-full w-full object-contain" />
            </div>
            <div className="grid gap-2 p-3 text-sm">
              <div className="truncate font-semibold">{item.name}</div>
              <div className="truncate text-xs text-[#68746c]">{item.path}</div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(item.markdown)}><Copy size={16} /></Button>
                <Button variant="danger" onClick={() => remove(item)}><Trash2 size={16} /></Button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
