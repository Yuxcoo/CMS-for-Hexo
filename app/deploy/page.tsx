import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeployClient } from '@/components/DeployClient';
import { isAuthenticated } from '@/lib/session';

export default function DeployPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="部署" description="查看最近提交和 GitHub Actions 状态。" />
      <DeployClient />
    </AppShell>
  );
}
