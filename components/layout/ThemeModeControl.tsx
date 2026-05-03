'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

const options: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: 'light', label: '白天', icon: Sun },
  { value: 'dark', label: '夜间', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor }
];

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolved;
}

export function ThemeModeControl() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem('cms-theme-mode') as ThemeMode | null;
    const initial = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setMode(initial);
    applyTheme(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const current = (window.localStorage.getItem('cms-theme-mode') as ThemeMode | null) || 'system';
      if (current === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function choose(nextMode: ThemeMode) {
    setMode(nextMode);
    window.localStorage.setItem('cms-theme-mode', nextMode);
    applyTheme(nextMode);
  }

  return (
    <div className="hidden items-center gap-1 sm:flex" aria-label="主题模式">
      {options.map((option) => {
        const Icon = option.icon;
        const active = mode === option.value;
        return (
          <button key={option.value} type="button" onClick={() => choose(option.value)} className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] leading-none tracking-[-0.12px] transition active:scale-95 ${active ? 'border-white bg-white text-black' : 'border-white/24 bg-transparent text-white/78 hover:border-white/52 hover:text-white'}`} title={option.label}>
            <Icon size={14} />
            <span className="hidden 2xl:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
