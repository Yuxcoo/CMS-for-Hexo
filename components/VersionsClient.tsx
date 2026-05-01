'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { DependencyVersion, VersionReport } from '@/types/version';

function VersionRow({ item }: { item: DependencyVersion }) {
  const state = item.updateHint === 'maybe-outdated' ? '可能可更新' : item.updateHint === 'ok' ? '最新' : '未知';
  return (
    <tr className="border-t border-line">
      <td className="px-3 py-3 font-medium">{item.name}</td>
      <td className="px-3 py-3">{item.current}</td>
      <td className="px-3 py-3">{item.latest || '-'}</td>
      <td className="px-3 py-3">{item.source}</td>
      <td className="px-3 py-3">{state}</td>
    </tr>
  );
}

export function VersionsClient() {
  const [report, setReport] = useState<VersionReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch('/api/versions');
    const result = await response.json();
    setReport(result.report || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-[#68746c]">包管理器</div>
            <div className="text-xl font-bold">{report?.packageManager || '未检测到锁文件'}</div>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} />刷新</Button>
        </div>
        {report?.note ? <p className="mt-3 text-sm text-[#68746c]">{report.note}</p> : null}
      </section>
      <section className="overflow-auto rounded-lg border border-line bg-white shadow-panel">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[#eef2ee]">
            <tr>
              <th className="px-3 py-3">依赖</th>
              <th className="px-3 py-3">当前</th>
              <th className="px-3 py-3">最新</th>
              <th className="px-3 py-3">来源</th>
              <th className="px-3 py-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {report?.all.map((item) => <VersionRow key={`${item.name}-${item.source}`} item={item} />)}
          </tbody>
        </table>
      </section>
    </div>
  );
}
