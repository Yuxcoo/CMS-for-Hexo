import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { RepositoryClient } from '@/components/RepositoryClient';
import { getOptionalRepoContext } from '@/lib/repo-context';
import { isAuthenticated } from '@/lib/session';

export default function OnboardingPage() {
  if (!isAuthenticated()) redirect('/login');
  if (getOptionalRepoContext()) redirect('/dashboard');

  return (
    <AppShell>
      <PageHeader title="连接博客仓库" description="先连接已有 Hexo 仓库，或创建一个新的可发布博客仓库。" />
      <RepositoryClient />
    </AppShell>
  );
}
