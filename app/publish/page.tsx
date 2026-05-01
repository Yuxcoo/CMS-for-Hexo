import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PublishClient } from '@/components/PublishClient';
import { isAuthenticated } from '@/lib/session';

export default function PublishPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="发布" description="发布博客、查看发布记录和最近内容变更。" />
      <PublishClient />
    </AppShell>
  );
}
