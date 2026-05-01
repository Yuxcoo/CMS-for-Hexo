import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { RepositoryClient } from '@/components/RepositoryClient';
import { isAuthenticated } from '@/lib/session';

export default function RepositoryPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="仓库" description="连接已有 GitHub 仓库，或创建一个新的 Hexo 存储仓库。" />
      <RepositoryClient />
    </AppShell>
  );
}
