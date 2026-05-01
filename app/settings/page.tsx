import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsClient } from '@/components/SettingsClient';
import { isAuthenticated } from '@/lib/session';

export default function SettingsPage() {
  if (!isAuthenticated()) redirect('/login');
  return (
    <AppShell>
      <PageHeader title="站点配置" description="编辑 Hexo 根目录 _config.yml。" />
      <SettingsClient />
    </AppShell>
  );
}
