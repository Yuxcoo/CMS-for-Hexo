import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardClient } from '@/components/DashboardClient';
import { isAuthenticated } from '@/lib/session';

export default function DashboardPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="仪表盘" description="管理你的 Hexo 仓库、内容与发布状态。" />
      <DashboardClient />
    </AppShell>
  );
}
