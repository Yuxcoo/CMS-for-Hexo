'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, ExternalLink, FileText, Gauge, Github, Image, LogOut, Menu, PanelTop, Rocket, ScrollText, Settings2, SlidersHorizontal } from 'lucide-react';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { ThemeModeControl } from '@/components/layout/ThemeModeControl';

const nav = [
  { href: '/dashboard', label: '仪表盘', icon: Gauge },
  { href: '/posts', label: '文章', icon: FileText },
  { href: '/drafts', label: '草稿', icon: ScrollText },
  { href: '/pages', label: '页面', icon: PanelTop },
  { href: '/media', label: '图片', icon: Image },
  { href: '/publish', label: '发布', icon: Rocket },
  { href: '/versions', label: '版本', icon: Settings2 },
  { href: '/settings', label: '配置', icon: SlidersHorizontal },
  { href: '/repository', label: '仓库', icon: Github }
];

function activeItem(pathname: string) {
  return nav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) || nav[0];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = activeItem(pathname);
  const CurrentIcon = current.icon;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40">
        <div className="h-10 bg-black text-white">
          <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-5">
              <Link href="/dashboard" className="font-display text-[13px] font-semibold leading-none tracking-[-0.12px]">
                CMS for Hexo
              </Link>
              <Link href="/repository" className="hidden items-center gap-1.5 text-[12px] leading-none tracking-[-0.12px] text-white/72 transition hover:text-white md:inline-flex">
                <Github size={14} /> 仓库
              </Link>
              <Link href="/versions" className="hidden items-center gap-1.5 text-[12px] leading-none tracking-[-0.12px] text-white/72 transition hover:text-white md:inline-flex">
                <Activity size={14} /> 健康检查
              </Link>
            </div>
            <div className="flex items-center gap-3 text-white/78">
              <Link href="/settings" className="hidden text-[12px] leading-none tracking-[-0.12px] transition hover:text-white sm:inline-flex">站点配置</Link>
              <a href="/" target="_blank" className="hidden items-center gap-1.5 text-[12px] leading-none tracking-[-0.12px] transition hover:text-white md:inline-flex">
                <ExternalLink size={14} /> 预览站点
              </a>
              <GlobalSearch />
              <ThemeModeControl />
              <button type="button" onClick={logout} className="hidden min-h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] leading-none tracking-[-0.12px] text-white transition active:scale-95 sm:inline-flex">
                <LogOut size={15} /> 登出
              </button>
              <Menu size={19} className="lg:hidden" />
            </div>
          </div>
        </div>
        <div className="border-b border-black/10 bg-paper/86 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex min-h-[48px] max-w-[1280px] items-center justify-between gap-4 px-4 py-1.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <CurrentIcon className="shrink-0 text-ink" size={18} />
              <span className="truncate font-display text-[18px] font-semibold leading-[1.2] tracking-[-0.18px] text-ink">{current.label}</span>
            </div>
            <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={`whitespace-nowrap rounded-full px-3 py-2 text-[13px] leading-none tracking-[-0.12px] transition ${active ? 'bg-canvas text-ink ring-1 ring-line' : 'text-muted hover:bg-canvas hover:text-blue'}`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Link href="/posts/new" className="rounded-full bg-blue px-4 py-2 text-[13px] leading-none tracking-[-0.12px] text-white transition hover:bg-blueFocus active:scale-95">
              新建文章
            </Link>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-[1280px] px-4 py-7 pb-20 sm:px-6 lg:px-8">{children}</div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-black/10 bg-paper/90 backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`grid min-h-14 min-w-16 place-items-center gap-1 px-2 text-[11px] leading-none tracking-[-0.08px] ${active ? 'text-blue' : 'text-muted'}`}>
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
