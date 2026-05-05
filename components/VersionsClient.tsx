'use client';

import { useEffect, useState } from 'react';
import { ArrowUpCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { DependencyVersion, VersionReport } from '@/types/version';

function VersionRow({ item, onUpgrade, upgrading }: { item: DependencyVersion; onUpgrade: (item: DependencyVersion) => void; upgrading: boolean }) {
  const state = item.updateHint === 'maybe-outdated' ? '可能可更新' : item.updateHint === 'ok' ? '最新' : '未知';
  const stateClass = item.updateHint === 'ok' ? 'text-success' : item.updateHint === 'maybe-outdated' ? 'text-blue' : 'text-muted';
  const upgradeLabel = item.source === 'theme'
    ? (item.canUpgrade ? '可升级' : '仅本地检测')
    : '-';
  return (
    <tr className="border-t border-line">
      <td className="px-3 py-3 font-semibold text-ink">{item.name}</td>
      <td className="px-3 py-3 text-muted">{item.current}</td>
      <td className="px-3 py-3 text-muted">{item.latest || '-'}</td>
      <td className="px-3 py-3 text-muted">{item.source}</td>
      <td className={`px-3 py-3 font-semibold ${stateClass}`}>{state}</td>
      <td className="px-3 py-3 text-right">
        {item.canUpgrade && item.latest && item.updateHint === 'maybe-outdated' ? (
          <Button variant="secondary" className="min-h-8 px-3 py-1 text-[13px]" onClick={() => onUpgrade(item)} disabled={upgrading}>
            <ArrowUpCircle size={15} />{upgrading ? '升级中...' : '升级'}
          </Button>
        ) : (
          <span className="text-[12px] text-muted">{upgradeLabel}</span>
        )}
      </td>
    </tr>
  );
}

export function VersionsClient() {
  const [report, setReport] = useState<VersionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradingName, setUpgradingName] = useState('');

  async function load() {
    setLoading(true);
    const response = await fetch('/api/versions');
    const result = await response.json();
    setReport(result.report || null);
    setLoading(false);
  }

  async function upgrade(item: DependencyVersion) {
    if (!item.canUpgrade) return;
    setUpgradingName(`${item.name}:${item.source}`);
    const response = await fetch('/api/versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upgrade', name: item.packageName || item.name, source: item.source, version: item.latest })
    });
    await response.json();
    setUpgradingName('');
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4">
      <section className="apple-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14px] leading-[1.29] tracking-[-0.224px] text-muted">包管理器</div>
            <div className="mt-1 font-display text-[26px] font-semibold leading-[1.2] tracking-[-0.18px] text-ink">{report?.packageManager || '未检测到锁文件'}</div>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} />刷新</Button>
        </div>
        {report?.note ? <p className="mt-4 text-[15px] leading-[1.45] tracking-[-0.18px] text-muted">{report.note}</p> : null}
      </section>
      <section className="overflow-hidden rounded-[14px] border border-line bg-canvas">
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[14px] leading-[1.29] tracking-[-0.224px]">
            <thead className="bg-paper text-ink">
              <tr>
                <th className="px-3 py-3 font-semibold">依赖</th>
                <th className="px-3 py-3 font-semibold">当前</th>
                <th className="px-3 py-3 font-semibold">最新</th>
                <th className="px-3 py-3 font-semibold">来源</th>
                <th className="px-3 py-3 font-semibold">状态</th>
                <th className="px-3 py-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {report?.all.map((item) => <VersionRow key={`${item.name}-${item.source}`} item={item} onUpgrade={upgrade} upgrading={upgradingName === `${item.name}:${item.source}`} />)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
