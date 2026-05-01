import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { VersionsClient } from '@/components/VersionsClient';
import { isAuthenticated } from '@/lib/session';

export default function VersionsPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="版本检查" description="检查 Hexo、主题和插件版本，便于后续更新。" />
      <VersionsClient />
    </AppShell>
  );
}
