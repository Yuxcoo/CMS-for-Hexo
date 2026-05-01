import { marked } from 'marked';

export function renderMarkdownPreview(markdown: string): string {
  const html = marked.parse(markdown || '', { async: false }) as string;
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}
