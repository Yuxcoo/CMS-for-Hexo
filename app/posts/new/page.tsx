import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostEditor } from '@/components/posts/PostEditor';
import { isAuthenticated } from '@/lib/session';

export default function NewPostPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="新建文章" description="保存后会提交到 Hexo 仓库。" />
      <PostEditor kind="post" />
    </AppShell>
  );
}
