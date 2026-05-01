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
      setError('密码不正确');
      return;
    }
    router.push('/dashboard');
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-panel">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#e7eee8] text-moss">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">CMS for Hexo</h1>
            <p className="text-sm text-[#68746c]">个人博客后台</p>
          </div>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          管理员密码
          <input className="min-h-11 rounded-md border border-line px-3 outline-none focus:border-moss" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
        </label>
        {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
        <Button className="mt-5 w-full" disabled={loading}>{loading ? '登录中...' : '登录'}</Button>
      </form>
    </main>
  );
}
