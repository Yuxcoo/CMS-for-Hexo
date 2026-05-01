import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CMS for Hexo',
  description: 'Personal Hexo blog admin backed by GitHub'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
