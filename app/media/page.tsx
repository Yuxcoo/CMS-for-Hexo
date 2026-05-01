import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { MediaClient } from '@/components/MediaClient';
import { isAuthenticated } from '@/lib/session';

export default function MediaPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="图片" description="上传到 Hexo 图片目录，并复制 Markdown 链接。" />
      <MediaClient />
    </AppShell>
  );
}
