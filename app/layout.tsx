import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CMS for Hexo',
  description: 'Personal Hexo blog admin backed by GitHub'
};

const themeInitScript = `
(function () {
  try {
    var mode = localStorage.getItem('cms-theme-mode') || 'system';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
