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
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-none bg-tile text-white">
        <div className="mx-auto grid min-h-[360px] max-w-5xl content-center gap-8 px-6 py-20 text-center sm:px-10">
          <div>
            <div className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-darkMuted">当前仓库</div>
            <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.28px] sm:text-[56px] sm:leading-[1.07]">{repoName}</h2>
          </div>
          <div className="grid gap-3 text-[17px] leading-[1.47] tracking-[-0.374px] text-darkMuted sm:grid-cols-2 lg:grid-cols-4">
            <span>分支：{health?.config?.branch || '-'}</span>
            <span>文章：{health?.config?.postsDir || '-'}</span>
            <span>草稿：{health?.config?.draftsDir || '-'}</span>
            <span>图片：{health?.config?.imagesDir || '-'}</span>
          </div>
          {health?.config && !health.config.ok ? <p className="text-[17px] text-blueDark">{health.config.error}</p> : null}
        </div>
      </section>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group rounded-[18px] border border-line bg-canvas p-6 transition hover:border-blue">
              <div className="mb-6 grid h-11 w-11 place-items-center rounded-full bg-paper text-blue transition group-active:scale-95">
                <Icon size={22} />
              </div>
              <h2 className="font-display text-[28px] font-semibold leading-[1.14] tracking-[-0.28px] text-ink">{card.title}</h2>
              <p className="mt-2 text-[17px] leading-[1.47] tracking-[-0.374px] text-muted">{card.desc}</p>
              <span className="mt-5 inline-flex text-[17px] leading-[1.47] tracking-[-0.374px] text-blue">打开</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
