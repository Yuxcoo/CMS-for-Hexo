'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, FileCode2, Folder, Loader2, Palette, Save, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';

type ThemeSummary = {
  name: string;
  path: string;
  active: boolean;
  configPath?: string;
  readmePath?: string;
};

type ThemeFile = {
  name: string;
  path: string;
  type: string;
  sha: string;
  size: number;
};

type EditableFile = {
  path: string;
  name: string;
  sha: string;
  size: number;
  content: string;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取主题包失败'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.readAsDataURL(file);
  });
}

function dirname(path: string) {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

export function ThemesClient() {
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [activeTheme, setActiveTheme] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [currentDir, setCurrentDir] = useState('');
  const [files, setFiles] = useState<ThemeFile[]>([]);
  const [editing, setEditing] = useState<EditableFile | null>(null);
  const [packageName, setPackageName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => themes.find((theme) => theme.name === selectedTheme), [selectedTheme, themes]);

  async function loadThemes() {
    const response = await fetch('/api/themes');
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || '加载主题失败');
      return;
    }
    setThemes(result.themes || []);
    setActiveTheme(result.activeTheme || '');
    setSelectedTheme((current) => current || result.activeTheme || result.themes?.[0]?.name || '');
  }

  const loadFiles = useCallback(async (theme: string, dir: string) => {
    if (!theme) return;
    const response = await fetch(`/api/themes?theme=${encodeURIComponent(theme)}&dir=${encodeURIComponent(dir)}`);
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || '加载主题文件失败');
      return;
    }
    setFiles(result.files || []);
    setCurrentDir(result.path || `themes/${theme}`);
  }, []);

  async function openTheme(theme: ThemeSummary) {
    setSelectedTheme(theme.name);
    setEditing(null);
  }

  async function activate(name: string) {
    setBusy(true);
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate', name })
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '启用主题失败');
      return;
    }
    setMessage(`已启用主题：${result.theme}`);
    loadThemes();
  }

  async function install(file: File) {
    if (!/\.zip$/i.test(file.name)) {
      setMessage('请拖入 .zip 主题包');
      return;
    }
    setBusy(true);
    setMessage(`正在解压并安装：${file.name}...`);
    try {
      const archiveBase64 = await fileToBase64(file);
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', name: packageName || file.name.replace(/\.zip$/i, ''), archiveBase64, activate: true })
      });
      const result = await response.json();
      setBusy(false);
      if (!response.ok) {
        setMessage(result.error || '安装主题失败');
        return;
      }
      setPackageName('');
      setSelectedTheme(result.theme);
      setMessage(`已安装 ${result.theme}，写入 ${result.installed} 个文件并设为当前主题`);
      await loadThemes();
      await loadFiles(result.theme, '');
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : '安装主题失败');
    }
  }

  async function openFile(file: ThemeFile) {
    if (file.type === 'dir') {
      setEditing(null);
      await loadFiles(selectedTheme, file.path);
      return;
    }
    const response = await fetch(`/api/themes?file=${encodeURIComponent(file.path)}`);
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || '读取主题文件失败');
      return;
    }
    setEditing(result.file);
    setMessage('');
  }

  async function saveFile() {
    if (!editing) return;
    setBusy(true);
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-file', path: editing.path, content: editing.content, sha: editing.sha })
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '保存主题文件失败');
      return;
    }
    setEditing((current) => current ? { ...current, sha: result.sha } : current);
    setMessage(`已保存：${editing.path}`);
    loadFiles(selectedTheme, currentDir);
  }

  function goUp() {
    const root = `themes/${selectedTheme}`;
    if (!currentDir || currentDir === root) return;
    const parent = dirname(currentDir);
    loadFiles(selectedTheme, parent === root ? '' : parent);
  }

  useEffect(() => {
    loadThemes();
  }, []);

  useEffect(() => {
    if (selectedTheme) loadFiles(selectedTheme, '');
  }, [loadFiles, selectedTheme]);

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="grid gap-4">
        <section className="apple-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 className="font-display text-[22px] font-semibold leading-[1.14] tracking-[-0.2px] text-ink">主题</h2>
            <span className="rounded-full bg-paper px-2.5 py-1 text-[12px] leading-none text-muted">{activeTheme || '未设置'}</span>
          </div>
          <div className="max-h-[320px] overflow-auto p-2">
            {!themes.length ? <p className="apple-message text-muted">还没有安装主题。</p> : null}
            {themes.map((theme) => (
              <button key={theme.name} type="button" onClick={() => openTheme(theme)} className={`mb-2 block w-full rounded-[10px] border p-3 text-left transition hover:border-blue ${selectedTheme === theme.name ? 'border-blue bg-paper' : 'border-transparent hover:bg-paper'}`}>
                <div className="flex items-center gap-2">
                  <Palette size={15} className={theme.active ? 'text-blue' : 'text-muted'} />
                  <span className="truncate text-[15px] font-semibold leading-[1.24] tracking-[-0.18px] text-ink">{theme.name}</span>
                  {theme.active ? <Check size={15} className="ml-auto text-blue" /> : null}
                </div>
                <div className="mt-1 truncate text-[12px] leading-none tracking-[-0.12px] text-muted">{theme.path}</div>
              </button>
            ))}
          </div>
          {selected ? <div className="border-t border-line p-3"><Button variant={selected.active ? 'ghost' : 'secondary'} className="w-full" onClick={() => activate(selected.name)} disabled={busy || selected.active}>{selected.active ? '当前主题' : '启用主题'}</Button></div> : null}
        </section>
        <section className={`apple-panel border-dashed p-4 transition ${dragging ? 'border-blue bg-blue/5' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) install(file); }}>
          <div className="grid gap-3">
            <div className="grid h-24 place-items-center rounded-[12px] border border-dashed border-line bg-paper text-muted">
              {busy ? <Loader2 size={22} className="animate-spin" /> : <UploadCloud size={24} />}
            </div>
            <Field label="主题名称">
              <TextInput value={packageName} onChange={(event) => setPackageName(event.target.value)} placeholder="留空则使用 zip 顶层目录" />
            </Field>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-blue px-4 py-2 text-[15px] leading-none tracking-[-0.18px] text-white transition hover:bg-blueFocus active:scale-95">
              <UploadCloud size={17} />选择主题包
              <input className="hidden" type="file" accept=".zip,application/zip" disabled={busy} onChange={(event) => event.target.files?.[0] && install(event.target.files[0])} />
            </label>
          </div>
        </section>
      </aside>
      <section className="grid min-w-0 gap-4">
        <div className="apple-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="min-w-0">
              <h2 className="font-display text-[22px] font-semibold leading-[1.14] tracking-[-0.2px] text-ink">主题文件</h2>
              <p className="mt-1 truncate text-[13px] leading-[1.35] tracking-[-0.12px] text-muted">{currentDir || '选择主题后浏览文件'}</p>
            </div>
            <Button variant="ghost" onClick={goUp} disabled={!selectedTheme || currentDir === `themes/${selectedTheme}`}>上一级</Button>
          </div>
          <div className="grid max-h-[260px] overflow-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => {
              const Icon = file.type === 'dir' ? Folder : FileCode2;
              return (
                <button key={file.path} type="button" onClick={() => openFile(file)} className={`m-1 rounded-[10px] border p-3 text-left transition hover:border-blue hover:bg-paper ${editing?.path === file.path ? 'border-blue bg-paper' : 'border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={file.type === 'dir' ? 'text-blue' : 'text-muted'} />
                    <span className="truncate text-[14px] font-semibold leading-[1.24] tracking-[-0.18px] text-ink">{file.name}</span>
                  </div>
                  <div className="mt-1 truncate text-[12px] leading-none text-muted">{file.type === 'dir' ? '目录' : `${Math.ceil(file.size / 1024)} KB`}</div>
                </button>
              );
            })}
          </div>
        </div>
        <section className="apple-card grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[22px] font-semibold leading-[1.14] tracking-[-0.2px] text-ink">文件编辑</h2>
              <p className="mt-1 truncate text-[13px] leading-[1.35] tracking-[-0.12px] text-muted">{editing?.path || '选择一个主题文件开始编辑'}</p>
            </div>
            <Button onClick={saveFile} disabled={busy || !editing}><Save size={17} />保存文件</Button>
          </div>
          <TextArea value={editing?.content || ''} onChange={(event) => setEditing((current) => current ? { ...current, content: event.target.value } : current)} disabled={!editing} className="min-h-[460px] font-mono text-[14px] tracking-normal" placeholder="主题文件内容" />
        </section>
        {message ? <p className="apple-message break-all">{message}</p> : null}
      </section>
    </div>
  );
}
