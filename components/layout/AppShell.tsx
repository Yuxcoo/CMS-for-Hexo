'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Gauge, Github, Image, LogOut, Menu, PanelTop, Rocket, ScrollText, Search, Settings2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
        <div className="h-11 bg-black text-white">
          <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="font-display text-[12px] font-semibold leading-none tracking-[-0.12px]">
              CMS for Hexo
            </Link>
            <nav className="hidden items-center gap-5 lg:flex">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={`text-[12px] font-normal leading-none tracking-[-0.12px] transition ${active ? 'text-white' : 'text-white/72 hover:text-white'}`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-3 text-white/80">
              <Search size={15} className="hidden sm:block" />
              <button type="button" onClick={logout} className="hidden min-h-8 items-center gap-2 rounded-lg bg-ink px-3 text-[14px] leading-none tracking-[-0.224px] text-white transition active:scale-95 sm:inline-flex">
                <LogOut size={15} /> 登出
              </button>
              <Menu size={19} className="lg:hidden" />
            </div>
          </div>
        </div>
        <div className="border-b border-black/10 bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex h-[52px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <CurrentIcon className="shrink-0 text-ink" size={20} />
              <span className="truncate font-display text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">{current.label}</span>
            </div>
            <div className="hidden min-w-0 items-center gap-4 overflow-x-auto md:flex">
              {nav.slice(0, 6).map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={`whitespace-nowrap text-[14px] leading-[1.29] tracking-[-0.224px] ${active ? 'text-ink' : 'text-muted hover:text-blue'}`}>
                    {item.label}
                  </Link>
                );
              })}
              <Link href="/posts/new" className="rounded-full bg-blue px-[18px] py-2 text-[14px] leading-[1.29] tracking-[-0.224px] text-white transition hover:bg-blueFocus active:scale-95">
                新建
              </Link>
            </div>
            <Link href="/posts/new" className="rounded-full bg-blue px-4 py-2 text-[14px] leading-[1.29] tracking-[-0.224px] text-white transition active:scale-95 md:hidden">
              新建
            </Link>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-[1440px] px-4 py-10 pb-24 sm:px-6 lg:px-8">{children}</div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-black/10 bg-paper/90 backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`grid min-h-16 min-w-20 place-items-center gap-1 px-2 text-[12px] leading-none tracking-[-0.12px] ${active ? 'text-blue' : 'text-muted'}`}>
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
