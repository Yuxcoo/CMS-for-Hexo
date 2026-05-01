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

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="text-sm text-[#68746c]">当前仓库</div>
        <div className="mt-1 text-xl font-bold">{health?.currentRepository ? `${health.currentRepository.owner}/${health.currentRepository.repo}` : health?.config?.repo || '未选择仓库'}</div>
        <div className="mt-3 grid gap-2 text-sm text-[#68746c] sm:grid-cols-2 lg:grid-cols-4">
          <span>分支：{health?.config?.branch || '-'}</span>
          <span>文章：{health?.config?.postsDir || '-'}</span>
          <span>草稿：{health?.config?.draftsDir || '-'}</span>
          <span>图片：{health?.config?.imagesDir || '-'}</span>
        </div>
        {health?.config && !health.config.ok ? <p className="mt-3 text-sm text-coral">{health.config.error}</p> : null}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="rounded-lg border border-line bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-moss">
              <Icon className="mb-4 text-moss" size={24} />
              <h2 className="text-lg font-bold">{card.title}</h2>
              <p className="mt-1 text-sm text-[#68746c]">{card.desc}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
