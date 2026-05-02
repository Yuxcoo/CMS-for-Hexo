'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: '登录失败' }));
      setError(result.error || '登录失败');
      return;
    }
    router.push('/dashboard');
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[14px] border border-line bg-canvas p-4">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-full bg-paper text-blue">
            <Lock size={20} />
          </div>
          <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.2px] text-ink">CMS for Hexo</h1>
          <p className="mt-2 text-[15px] leading-[1.45] tracking-[-0.18px] text-muted">个人博客后台</p>
        </div>
        <label className="grid gap-2 text-sm font-semibold leading-[1.29] tracking-[-0.224px] text-ink">
          管理员密码
          <input className="min-h-10 rounded-full border border-line bg-canvas px-4 py-2 text-[15px] leading-[1.45] tracking-[-0.18px] outline-none transition focus:border-blueFocus focus:ring-2 focus:ring-blueFocus/20" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
        </label>
        {error ? <p className="mt-3 text-[14px] leading-[1.29] tracking-[-0.224px] text-danger">{error}</p> : null}
        <Button className="mt-4 w-full" disabled={loading}>{loading ? '登录中...' : '登录'}</Button>
      </form>
    </main>
  );
}
