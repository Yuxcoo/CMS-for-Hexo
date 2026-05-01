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
      <PageHeader title="文章" description="编辑 source/_posts 中的 Hexo 文章。" action={<Link href="/posts/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-medium text-white"><Plus size={17} />新建文章</Link>} />
      <PostManager kind="post" />
    </AppShell>
  );
}
