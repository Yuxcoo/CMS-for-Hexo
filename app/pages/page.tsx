import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PagesClient } from '@/components/PagesClient';
import { isAuthenticated } from '@/lib/session';

export default function PagesPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="页面导航" description="创建博客独立页面，并加入主题顶部导航菜单。" />
      <PagesClient />
    </AppShell>
  );
}
