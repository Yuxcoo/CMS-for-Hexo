'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

const modes: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
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

function nextMode(mode: ThemeMode): ThemeMode {
  if (mode === 'light') return 'dark';
  if (mode === 'dark') return 'system';
  return 'light';
}

export function ThemeModeControl() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const current = useMemo(() => modes.find((item) => item.value === mode) || modes[2], [mode]);
  const Icon = current.icon;

  useEffect(() => {
    const stored = window.localStorage.getItem('cms-theme-mode') as ThemeMode | null;
    const initial = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setMode(initial);
    applyTheme(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const currentMode = (window.localStorage.getItem('cms-theme-mode') as ThemeMode | null) || 'system';
      if (currentMode === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function toggle() {
    const next = nextMode(mode);
    setMode(next);
    window.localStorage.setItem('cms-theme-mode', next);
    applyTheme(next);
  }

  return (
    <button type="button" onClick={toggle} className="hidden min-h-8 items-center gap-2 rounded-full border border-white/24 bg-white/10 px-2 py-1 text-[12px] leading-none tracking-[-0.12px] text-white/82 transition hover:border-white/50 hover:bg-white/15 hover:text-white active:scale-95 sm:inline-flex" title={`主题：${current.label}`} aria-label={`切换主题，当前为${current.label}`}>
      <span className="relative h-4 w-8 rounded-full bg-white/20 shadow-inner">
        <span className={`absolute top-0.5 grid h-3 w-3 place-items-center rounded-full bg-white text-black transition-all ${mode === 'light' ? 'left-0.5' : mode === 'dark' ? 'left-[18px]' : 'left-[9px]'}`}>
          <Icon size={9} />
        </span>
      </span>
      <span className="hidden xl:inline">{current.label}</span>
    </button>
  );
}
