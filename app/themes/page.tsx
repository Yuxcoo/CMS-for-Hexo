import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ThemesClient } from '@/components/ThemesClient';
import { isAuthenticated } from '@/lib/session';

export default function ThemesPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="主题" description="安装、启用和编辑 Hexo 主题文件。" />
      <ThemesClient />
    </AppShell>
  );
}
