import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PostManager } from '@/components/posts/PostManager';
import { isAuthenticated } from '@/lib/session';

export default function DraftsPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="草稿" description="编辑 source/_drafts，并可一键发布到文章目录。" />
      <PostManager kind="draft" />
    </AppShell>
  );
}
