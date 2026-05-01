'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Gauge, Github, Image, LogOut, Rocket, ScrollText, Settings2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const nav = [
  { href: '/dashboard', label: '仪表盘', icon: Gauge },
  { href: '/posts', label: '文章', icon: FileText },
  { href: '/drafts', label: '草稿', icon: ScrollText },
  { href: '/media', label: '图片', icon: Image },
  { href: '/deploy', label: '部署', icon: Rocket },
  { href: '/versions', label: '版本', icon: Settings2 },
  { href: '/settings', label: '配置', icon: SlidersHorizontal },
  { href: '/repository', label: '仓库', icon: Github }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-4 py-5 lg:block">
        <div className="mb-8">
          <div className="text-lg font-bold">CMS for Hexo</div>
          <div className="text-sm text-[#68746c]">GitHub-backed blog admin</div>
        </div>
        <nav className="grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${active ? 'bg-[#e7eee8] text-moss' : 'text-ink hover:bg-[#f1f4f1]'}`}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" className="absolute bottom-5 left-4 right-4" onClick={logout}>
          <LogOut size={18} /> 登出
        </Button>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-line bg-white lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`grid min-h-14 min-w-20 place-items-center text-xs ${active ? 'text-moss' : 'text-[#68746c]'}`}>
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
