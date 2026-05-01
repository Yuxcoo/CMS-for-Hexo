'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';

const fields = ['title', 'subtitle', 'description', 'author', 'language', 'timezone', 'url', 'theme'];

export function SettingsClient() {
  const [sha, setSha] = useState('');
  const [raw, setRaw] = useState('');
  const [data, setData] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'common' | 'yaml' | 'theme'>('common');
  const [themePath, setThemePath] = useState('');
  const [themeSha, setThemeSha] = useState('');
  const [themeRaw, setThemeRaw] = useState('');

  async function load() {
    setBusy(true);
    const response = await fetch('/api/config');
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '加载配置失败');
      return;
    }
    setSha(result.config.sha || '');
    setRaw(result.config.raw || '');
    const nextData: Record<string, string> = {};
    for (const key of fields) nextData[key] = String(result.config.data?.[key] || '');
    setData(nextData);
  }

  async function loadTheme() {
    setBusy(true);
    const response = await fetch('/api/theme-config');
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '加载主题配置失败');
      return;
    }
    setThemePath(result.config.path || '');
    setThemeSha(result.config.sha || '');
    setThemeRaw(result.config.raw || '');
  }

  async function saveCommon() {
    await save({ fields: data, sha });
  }

  async function saveYaml() {
    await save({ raw, sha });
  }

  async function saveTheme() {
    setBusy(true);
    const response = await fetch('/api/theme-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: themePath, raw: themeRaw, sha: themeSha })
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '保存主题配置失败');
      return;
    }
    setMessage(`已保存主题配置：${result.commit?.sha?.slice(0, 7) || themePath}`);
    loadTheme();
  }

  async function save(payload: { raw?: string; fields?: Record<string, string>; sha?: string }) {
    setBusy(true);
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '保存失败');
      return;
    }
    setMessage(`已保存：${result.commit?.sha?.slice(0, 7) || 'config'}`);
    load();
  }

  useEffect(() => {
    load();
    loadTheme();
  }, []);

  return (
    <div className="grid gap-5">
      <div className="inline-flex w-fit rounded-md border border-line bg-white p-1">
        <button className={`rounded px-3 py-2 text-sm ${mode === 'common' ? 'bg-[#e7eee8] text-moss' : ''}`} onClick={() => setMode('common')}>常用字段</button>
        <button className={`rounded px-3 py-2 text-sm ${mode === 'yaml' ? 'bg-[#e7eee8] text-moss' : ''}`} onClick={() => setMode('yaml')}>完整 YAML</button>
        <button className={`rounded px-3 py-2 text-sm ${mode === 'theme' ? 'bg-[#e7eee8] text-moss' : ''}`} onClick={() => setMode('theme')}>主题 YAML</button>
      </div>
      {mode === 'common' ? (
        <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((key) => (
              <Field key={key} label={key}>
                <TextInput value={data[key] || ''} onChange={(event) => setData((current) => ({ ...current, [key]: event.target.value }))} />
              </Field>
            ))}
          </div>
          <Button className="mt-4" onClick={saveCommon} disabled={busy}><Save size={17} />保存常用字段</Button>
        </section>
      ) : mode === 'yaml' ? (
        <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
          <TextArea value={raw} onChange={(event) => setRaw(event.target.value)} className="min-h-[620px] font-mono" />
          <Button className="mt-4" onClick={saveYaml} disabled={busy}><Save size={17} />保存 YAML</Button>
        </section>
      ) : (
        <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
          <Field label="主题配置路径">
            <TextInput value={themePath} onChange={(event) => setThemePath(event.target.value)} placeholder="_config.theme.yml 或 themes/theme/_config.yml" />
          </Field>
          <TextArea value={themeRaw} onChange={(event) => setThemeRaw(event.target.value)} className="mt-4 min-h-[620px] font-mono" />
          <Button className="mt-4" onClick={saveTheme} disabled={busy || !themePath}><Save size={17} />保存主题 YAML</Button>
        </section>
      )}
      {message ? <p className="rounded-md bg-[#eef2ee] px-3 py-2 text-sm">{message}</p> : null}
    </div>
  );
}
