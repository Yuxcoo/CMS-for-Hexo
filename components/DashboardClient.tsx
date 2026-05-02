'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Image, Rocket, Settings2 } from 'lucide-react';

type Health = {
  config?: { ok: boolean; repo?: string | null; branch?: string; postsDir?: string; draftsDir?: string; imagesDir?: string; workflow?: string | null; error?: string };
  currentRepository?: { owner: string; repo: string } | null;
};

export function DashboardClient() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    fetch('/api/health').then((response) => response.json()).then(setHealth).catch(() => setHealth({}));
  }, []);

  const cards = [
    { href: '/posts', title: '写文章', desc: '新建、编辑、删除 Hexo 文章', icon: FileText },
    { href: '/drafts', title: '草稿箱', desc: '保存想法，准备好再发布', icon: FileText },
    { href: '/media', title: '图片库', desc: '上传图片并复制 Markdown 链接', icon: Image },
    { href: '/publish', title: '发布中心', desc: '发布博客并查看发布记录', icon: Rocket },
    { href: '/versions', title: '版本检查', desc: '检查 Hexo、主题和插件版本', icon: Settings2 }
  ];

  const repoName = health?.currentRepository ? `${health.currentRepository.owner}/${health.currentRepository.repo}` : health?.config?.repo || '未选择仓库';

  return (
    <div className="grid gap-4">
      <section className="rounded-[14px] border border-line bg-canvas p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-none tracking-[-0.12px] text-muted">当前仓库</div>
            <h2 className="mt-2 truncate font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.24px] text-ink sm:text-[32px]">{repoName}</h2>
            {health?.config && !health.config.ok ? <p className="mt-2 text-[14px] leading-[1.4] text-danger">{health.config.error}</p> : null}
          </div>
          <div className="grid gap-2 text-[14px] leading-[1.35] tracking-[-0.12px] text-muted sm:grid-cols-2 lg:min-w-[540px] lg:grid-cols-4">
            <span className="rounded-[10px] bg-paper px-3 py-2">分支：{health?.config?.branch || '-'}</span>
            <span className="rounded-[10px] bg-paper px-3 py-2">文章：{health?.config?.postsDir || '-'}</span>
            <span className="rounded-[10px] bg-paper px-3 py-2">草稿：{health?.config?.draftsDir || '-'}</span>
            <span className="rounded-[10px] bg-paper px-3 py-2">图片：{health?.config?.imagesDir || '-'}</span>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group rounded-[14px] border border-line bg-canvas p-5 transition hover:border-blue">
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-paper text-blue transition group-active:scale-95">
                <Icon size={19} />
              </div>
              <h2 className="font-display text-[22px] font-semibold leading-[1.18] tracking-[-0.2px] text-ink">{card.title}</h2>
              <p className="mt-1.5 text-[15px] leading-[1.45] tracking-[-0.18px] text-muted">{card.desc}</p>
              <span className="mt-4 inline-flex text-[15px] leading-[1.45] tracking-[-0.18px] text-blue">打开</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
