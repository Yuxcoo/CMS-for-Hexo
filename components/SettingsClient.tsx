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

  const tabs: Array<{ value: typeof mode; label: string }> = [
    { value: 'common', label: '常用字段' },
    { value: 'yaml', label: '完整 YAML' },
    { value: 'theme', label: '主题 YAML' }
  ];

  return (
    <div className="grid gap-4">
      <div className="inline-flex w-fit rounded-full border border-line bg-canvas p-1">
        {tabs.map((tab) => (
          <button key={tab.value} className={`rounded-full px-4 py-2 text-[14px] leading-[1.29] tracking-[-0.224px] transition active:scale-95 ${mode === tab.value ? 'bg-blue text-white' : 'text-muted hover:text-blue'}`} onClick={() => setMode(tab.value)}>
            {tab.label}
          </button>
        ))}
      </div>
      {mode === 'common' ? (
        <section className="apple-card">
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
        <section className="apple-card">
          <TextArea value={raw} onChange={(event) => setRaw(event.target.value)} className="min-h-[500px] font-mono text-[15px] tracking-normal" />
          <Button className="mt-4" onClick={saveYaml} disabled={busy}><Save size={17} />保存 YAML</Button>
        </section>
      ) : (
        <section className="apple-card">
          <Field label="主题配置路径">
            <TextInput value={themePath} onChange={(event) => setThemePath(event.target.value)} placeholder="_config.theme.yml 或 themes/theme/_config.yml" />
          </Field>
          <TextArea value={themeRaw} onChange={(event) => setThemeRaw(event.target.value)} className="mt-4 min-h-[500px] font-mono text-[15px] tracking-normal" />
          <Button className="mt-4" onClick={saveTheme} disabled={busy || !themePath}><Save size={17} />保存主题 YAML</Button>
        </section>
      )}
      {message ? <p className="apple-message break-all">{message}</p> : null}
    </div>
  );
}
