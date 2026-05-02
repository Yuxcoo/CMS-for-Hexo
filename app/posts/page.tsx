import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostManager } from '@/components/posts/PostManager';
import { isAuthenticated } from '@/lib/session';

export default function PostsPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="文章" description="编辑 source/_posts 中的 Hexo 文章。" action={<Link href="/posts/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue px-[22px] py-[11px] text-[17px] font-normal leading-none tracking-[-0.374px] text-white transition hover:bg-blueFocus active:scale-95"><Plus size={17} />新建文章</Link>} />
      <PostManager kind="post" />
    </AppShell>
  );
}
