'use client';

import type { ClipboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eraser,
  FilePenLine,
  GripVertical,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Paintbrush2,
  Pin,
  PinOff,
  Redo2,
  Save,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  UploadCloud
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { renderMarkdownPreview } from '@/lib/markdown-preview';
import type { PostContent, PostKind, PostMeta, PostSummary } from '@/types/post';

type Props = {
  kind: PostKind;
  initial?: PostContent;
  onSaved?: (post: { path: string; sha: string }) => void;
  onDeleted?: () => void;
};

type HistoryState = {
  past: string[];
  future: string[];
};

type SelectionRange = {
  start: number;
  end: number;
};

type BrushStyle =
  | {
    kind: 'composite';
    block?: 'h1' | 'h2' | 'h3' | 'quote' | 'unordered-list' | 'ordered-list' | 'task-list';
    indentDepth?: number;
    wrappers: Array<{ prefix: string; suffix: string }>;
  };

type BlockInsertOption =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'ordered-list'
  | 'unordered-list'
  | 'task-list'
  | 'quote'
  | 'divider'
  | 'code'
  | 'image'
  | 'table'
  | 'link'
  | 'formula';

type BlockStyleOption = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'code';
type IndentOption = 'increase' | 'decrease';
type ImageInsertMode = 'upload' | 'link';
type ToolbarOverflowAction = 'color' | 'highlight' | 'table' | 'quote' | 'divider' | 'formula';

const emptyMeta: PostMeta = {
  title: '',
  date: new Date().toISOString(),
  tags: [],
  categories: [],
  permalink: '',
  priority: 0,
  sticky: false
};

const blockInsertLabels: Record<BlockInsertOption, string> = {
  h1: '一级标题',
  h2: '二级标题',
  h3: '三级标题',
  'ordered-list': '有序列表',
  'unordered-list': '无序列表',
  'task-list': '任务列表',
  quote: '引用',
  divider: '分割线',
  code: '代码块',
  image: '图片',
  table: '表格',
  link: '链接',
  formula: '公式'
};

function arrayToText(value: string[]) {
  return value.join(', ');
}

function textToArray(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function cleanMeta(meta: PostMeta): PostMeta {
  const next = { ...meta };
  if (!String(next.permalink || '').trim()) delete next.permalink;
  if (!Number.isFinite(Number(next.priority))) delete next.priority;
  if (!next.sticky) delete next.sticky;
  return next;
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/<u>(.*?)<\/u>/gi, '$1')
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function isImageUrl(value: string) {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?\S*)?(#\S*)?$/i.test(value.trim());
}

function stripListLine(value: string) {
  return value
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .trim();
}

function stripBlockMarkdown(value: string) {
  return value
    .split('\n')
    .map((line) => line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*>\s?/, '')
      .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, '')
      .replace(/^\s*\d+\.\s+/, '')
      .replace(/^\s*[-*+]\s+/, '')
      .replace(/^```[\w-]*\s*$/, '')
      .replace(/^\s{2}/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toggleWrap(value: string, prefix: string, suffix = prefix, fallback = '文本') {
  const content = value || fallback;
  if (content.startsWith(prefix) && content.endsWith(suffix)) {
    return content.slice(prefix.length, content.length - suffix.length);
  }
  return `${prefix}${content}${suffix}`;
}

function applyLinePrefix(value: string, prefix: string) {
  const lines = (value || '内容').split('\n');
  return lines.map((line, index) => `${prefix}${line || (index === 0 ? '内容' : '')}`).join('\n');
}

function toggleLinePrefix(value: string, prefix: string) {
  const lines = (value || '内容').split('\n');
  const normalizedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`^${normalizedPrefix}`);
  const everyLineHasPrefix = lines.every((line) => expression.test(line));
  return lines.map((line, index) => {
    if (everyLineHasPrefix) return line.replace(expression, '');
    return `${prefix}${line || (index === 0 ? '内容' : '')}`;
  }).join('\n');
}

function toggleOrderedList(value: string) {
  const lines = (value || '列表项').split('\n');
  const everyLineOrdered = lines.every((line) => /^\s*\d+\.\s+/.test(line));
  return lines.map((line, index) => {
    if (everyLineOrdered) return line.replace(/^\s*\d+\.\s+/, '');
    return `${index + 1}. ${stripListLine(line) || `列表项 ${index + 1}`}`;
  }).join('\n');
}

function applyOrderedList(value: string) {
  return (value || '列表项')
    .split('\n')
    .map((line, index) => `${index + 1}. ${stripListLine(line) || `列表项 ${index + 1}`}`)
    .join('\n');
}

function detectBrushStyle(value: string): BrushStyle | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const wrappers: Array<{ prefix: string; suffix: string }> = [];
  let working = trimmed;

  const lines = working.split('\n');
  let block: BrushStyle['block'];
  let indentDepth = 0;

  if (lines.every((line) => /^###\s+/.test(line))) {
    block = 'h3';
    working = lines.map((line) => line.replace(/^###\s+/, '')).join('\n');
  } else if (lines.every((line) => /^##\s+/.test(line))) {
    block = 'h2';
    working = lines.map((line) => line.replace(/^##\s+/, '')).join('\n');
  } else if (lines.every((line) => /^#\s+/.test(line))) {
    block = 'h1';
    working = lines.map((line) => line.replace(/^#\s+/, '')).join('\n');
  } else if (lines.every((line) => /^>\s?/.test(line))) {
    block = 'quote';
    working = lines.map((line) => line.replace(/^>\s?/, '')).join('\n');
  } else if (lines.every((line) => /^-\s+\[[ xX]\]\s+/.test(line))) {
    block = 'task-list';
    working = lines.map((line) => line.replace(/^-\s+\[[ xX]\]\s+/, '')).join('\n');
  } else if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    block = 'ordered-list';
    working = lines.map((line) => line.replace(/^\d+\.\s+/, '')).join('\n');
  } else if (lines.every((line) => /^[-*+]\s+/.test(line))) {
    block = 'unordered-list';
    working = lines.map((line) => line.replace(/^[-*+]\s+/, '')).join('\n');
  }

  const indentMatches = working.split('\n').map((line) => {
    const match = line.match(/^(\s+)/);
    return match ? match[1].length : 0;
  }).filter((value) => value > 0);
  if (indentMatches.length) {
    indentDepth = Math.min(...indentMatches);
    working = working.split('\n').map((line) => line.replace(new RegExp(`^\\s{0,${indentDepth}}`), '')).join('\n');
  }

  let changed = true;
  while (changed) {
    changed = false;

    const colorMatch = working.match(/^<span style="color:\s*([^";]+);?">([\s\S]*)<\/span>$/i);
    if (colorMatch) {
      wrappers.push({ prefix: `<span style="color: ${colorMatch[1]};">`, suffix: '</span>' });
      working = colorMatch[2];
      changed = true;
      continue;
    }

    const highlightMatch = working.match(/^<mark style="background-color:\s*([^";]+);\s*color:\s*inherit;">([\s\S]*)<\/mark>$/i);
    if (highlightMatch) {
      wrappers.push({ prefix: `<mark style="background-color: ${highlightMatch[1]}; color: inherit;">`, suffix: '</mark>' });
      working = highlightMatch[2];
      changed = true;
      continue;
    }

    const underlineMatch = working.match(/^<u>([\s\S]*)<\/u>$/i);
    if (underlineMatch) {
      wrappers.push({ prefix: '<u>', suffix: '</u>' });
      working = underlineMatch[1];
      changed = true;
      continue;
    }

    const strongMatch = working.match(/^\*\*([\s\S]*)\*\*$/);
    if (strongMatch) {
      wrappers.push({ prefix: '**', suffix: '**' });
      working = strongMatch[1];
      changed = true;
      continue;
    }

    const strikeMatch = working.match(/^~~([\s\S]*)~~$/);
    if (strikeMatch) {
      wrappers.push({ prefix: '~~', suffix: '~~' });
      working = strikeMatch[1];
      changed = true;
      continue;
    }

    const italicMatch = working.match(/^\*([\s\S]*)\*$/);
    if (italicMatch) {
      wrappers.push({ prefix: '*', suffix: '*' });
      working = italicMatch[1];
      changed = true;
    }
  }

  if (!block && !indentDepth && !wrappers.length) return null;
  return { kind: 'composite', block, indentDepth, wrappers };
}

function applyBrushStyle(value: string, style: BrushStyle) {
  let next = stripBlockMarkdown(stripInlineMarkdown(value || '内容'));

  if (style.block === 'h1') next = applyLinePrefix(next, '# ');
  if (style.block === 'h2') next = applyLinePrefix(next, '## ');
  if (style.block === 'h3') next = applyLinePrefix(next, '### ');
  if (style.block === 'quote') next = applyLinePrefix(next, '> ');
  if (style.block === 'unordered-list') next = applyLinePrefix(next, '- ');
  if (style.block === 'ordered-list') next = applyOrderedList(next);
  if (style.block === 'task-list') next = applyLinePrefix(next, '- [ ] ');
  if (style.indentDepth) {
    next = next.split('\n').map((line) => `${' '.repeat(style.indentDepth || 0)}${line}`).join('\n');
  }

  [...style.wrappers].reverse().forEach((wrapper) => {
    next = `${wrapper.prefix}${next}${wrapper.suffix}`;
  });

  return next;
}

function ToolbarButton({
  title,
  active = false,
  children,
  onClick,
  disabled = false
}: {
  title: string;
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`editor-toolbar-button ${active ? 'editor-toolbar-button-active' : ''}`}
    >
      {children}
    </button>
  );
}

export function PostEditor({ kind, initial, onSaved, onDeleted }: Props) {
  const [meta, setMeta] = useState<PostMeta>(initial?.meta || emptyMeta);
  const [body, setBody] = useState(initial?.body || '');
  const [path, setPath] = useState(initial?.path || '');
  const [sha, setSha] = useState(initial?.sha || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showMeta, setShowMeta] = useState(false);
  const [insertValue, setInsertValue] = useState('');
  const [blockValue, setBlockValue] = useState<BlockStyleOption>('paragraph');
  const [brushStyle, setBrushStyle] = useState<BrushStyle | null>(null);
  const [selection, setSelection] = useState<SelectionRange>({ start: 0, end: 0 });
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageMode, setImageMode] = useState<ImageInsertMode>('upload');
  const [imageAlt, setImageAlt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [overflowAction, setOverflowAction] = useState<ToolbarOverflowAction | ''>('');
  const preview = useMemo(() => renderMarkdownPreview(body || ''), [body]);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const highlightInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<HistoryState>({ past: [], future: [] });
  const suppressHistoryRef = useRef(false);

  useEffect(() => {
    if (!initial) return;
    suppressHistoryRef.current = true;
    historyRef.current = { past: [], future: [] };
    setMeta({
      ...initial.meta,
      permalink: String(initial.meta.permalink || ''),
      priority: Number(initial.meta.priority || 0),
      sticky: Boolean(initial.meta.sticky)
    });
    setBody(initial.body);
    setPath(initial.path);
    setSha(initial.sha);
    setSelection({ start: 0, end: 0 });
  }, [initial]);

  function updateMeta(key: keyof PostMeta, value: PostMeta[keyof PostMeta]) {
    setMeta((current) => ({ ...current, [key]: value }));
  }

  function pushHistory(nextPastValue: string) {
    const { past } = historyRef.current;
    if (past[past.length - 1] === nextPastValue) return;
    historyRef.current = {
      past: [...past.slice(-119), nextPastValue],
      future: []
    };
  }

  function updateSelectionFromEditor() {
    const editor = editorRef.current;
    if (!editor) return;
    setSelection({ start: editor.selectionStart, end: editor.selectionEnd });
  }

  function focusEditor(nextSelection?: SelectionRange) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const target = nextSelection || selection;
    requestAnimationFrame(() => {
      editor.setSelectionRange(target.start, target.end);
      setSelection(target);
    });
  }

  function replaceBody(nextBody: string, nextSelection?: SelectionRange) {
    pushHistory(body);
    suppressHistoryRef.current = true;
    setBody(nextBody);
    if (nextSelection) focusEditor(nextSelection);
  }

  function transformSelection(
    transform: (selected: string, fullText: string) => { text: string; selection?: SelectionRange } | string
  ) {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = body.slice(start, end);
    const before = body.slice(0, start);
    const after = body.slice(end);
    const result = transform(selected, body);
    const nextText = typeof result === 'string' ? result : result.text;
    const nextBody = `${before}${nextText}${after}`;
    const nextSelection = typeof result === 'string'
      ? { start, end: start + nextText.length }
      : result.selection || { start, end: start + nextText.length };
    replaceBody(nextBody, nextSelection);
  }

  function handleBodyChange(nextValue: string) {
    if (!suppressHistoryRef.current && nextValue !== body) pushHistory(body);
    suppressHistoryRef.current = false;
    setBody(nextValue);
  }

  function handleEditorPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData('text/plain').trim();
    if (!isImageUrl(pastedText)) return;
    event.preventDefault();
    const selectedText = body.slice(selection.start, selection.end).trim();
    const alt = stripInlineMarkdown(selectedText) || imageAlt.trim() || 'image';
    transformSelection(() => `![${alt}](${pastedText})`);
    setMessage('已将图片直链自动转换为 Markdown 图片');
  }

  function undo() {
    const previous = historyRef.current.past[historyRef.current.past.length - 1];
    if (previous == null) return;
    historyRef.current = {
      past: historyRef.current.past.slice(0, -1),
      future: [body, ...historyRef.current.future].slice(0, 120)
    };
    suppressHistoryRef.current = true;
    setBody(previous);
    focusEditor({ start: previous.length, end: previous.length });
  }

  function redo() {
    const next = historyRef.current.future[0];
    if (next == null) return;
    historyRef.current = {
      past: [...historyRef.current.past, body].slice(-120),
      future: historyRef.current.future.slice(1)
    };
    suppressHistoryRef.current = true;
    setBody(next);
    focusEditor({ start: next.length, end: next.length });
  }

  function captureBrush() {
    const editor = editorRef.current;
    if (!editor) return;
    const selected = body.slice(editor.selectionStart, editor.selectionEnd);
    const style = detectBrushStyle(selected);
    if (!style) {
      setMessage('请先选中一段带格式的内容，再点击格式刷复制格式');
      return;
    }
    setBrushStyle(style);
    setMessage('已复制当前选区格式，选择另一段内容后再次点击格式刷即可应用');
  }

  function applyBrush() {
    const editor = editorRef.current;
    const selected = editor ? body.slice(editor.selectionStart, editor.selectionEnd) : '';
    const detected = detectBrushStyle(selected);

    if (detected) {
      setBrushStyle(detected);
      setMessage('已复制当前选区格式，选择另一段内容后再次点击格式刷即可应用');
      return;
    }

    if (!brushStyle || brushStyle.kind !== 'composite') {
      captureBrush();
      return;
    }
    transformSelection((selected) => applyBrushStyle(selected, brushStyle));
    setBrushStyle(null);
    setMessage('已应用复制的格式');
  }

  function clearStyles() {
    transformSelection((selected) => stripBlockMarkdown(stripInlineMarkdown(selected || '内容')));
  }

  function applyBlockStyle(value: BlockStyleOption) {
    setBlockValue(value);
    if (value === 'paragraph') {
      clearStyles();
      return;
    }
    if (value === 'code') {
      transformSelection((selected) => `\`\`\`\n${stripBlockMarkdown(selected || '') || 'code'}\n\`\`\``);
      return;
    }
    if (value === 'quote') {
      transformSelection((selected) => applyLinePrefix(stripBlockMarkdown(selected), '> '));
      return;
    }
    const prefixMap: Record<Exclude<BlockStyleOption, 'paragraph' | 'quote' | 'code'>, string> = {
      h1: '# ',
      h2: '## ',
      h3: '### '
    };
    transformSelection((selected) => applyLinePrefix(stripBlockMarkdown(selected), prefixMap[value as 'h1' | 'h2' | 'h3']));
  }

  function insertBlock(value: BlockInsertOption) {
    if (value === 'image') {
      openImagePanel();
      setInsertValue('');
      return;
    }
    if (value === 'link') {
      insertLink();
      setInsertValue('');
      return;
    }
    if (value === 'table') {
      insertTable();
      setInsertValue('');
      return;
    }

    const templates: Record<Exclude<BlockInsertOption, 'image' | 'link' | 'table'>, string> = {
      h1: '# 一级标题',
      h2: '## 二级标题',
      h3: '### 三级标题',
      'ordered-list': '1. 列表项一\n2. 列表项二',
      'unordered-list': '- 列表项一\n- 列表项二',
      'task-list': '- [ ] 待办事项一\n- [x] 已完成事项',
      quote: '> 这里写引用内容',
      divider: '\n---\n',
      code: '```ts\nconst message = \'Hello Hexo\';\n```',
      formula: '$$\nE = mc^2\n$$'
    };

    transformSelection((selected) => {
      const content = selected.trim() ? selected : templates[value as Exclude<BlockInsertOption, 'image' | 'link' | 'table'>];
      return `\n${content}\n`;
    });
    setInsertValue('');
  }

  function insertLink() {
    const url = prompt('输入链接地址', 'https://');
    if (!url) return;
    transformSelection((selected) => `[${selected || '链接文字'}](${url})`);
  }

  function openImagePanel() {
    const selectedText = body.slice(selection.start, selection.end).trim();
    setImageMode('upload');
    setImageAlt(stripInlineMarkdown(selectedText) || '');
    setImageUrl('');
    setShowImagePanel(true);
  }

  function closeImagePanel() {
    setShowImagePanel(false);
    setImageUrl('');
  }

  function insertTable() {
    transformSelection((selected) => selected.trim() || '| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |');
  }

  function insertColor(color: string) {
    transformSelection((selected) => `<span style="color: ${color};">${selected || '彩色文字'}</span>`);
  }

  function insertHighlight(color: string) {
    transformSelection((selected) => `<mark style="background-color: ${color}; color: inherit;">${selected || '高亮文字'}</mark>`);
  }

  function changeIndent(value: IndentOption) {
    transformSelection((selected) => {
      const lines = (selected || '内容').split('\n');
      return lines.map((line) => {
        if (value === 'increase') return `  ${line}`;
        return line.replace(/^\s{1,2}/, '');
      }).join('\n');
    });
  }

  function runOverflowAction(value: ToolbarOverflowAction) {
    setOverflowAction('');
    if (value === 'color') {
      colorInputRef.current?.click();
      return;
    }
    if (value === 'highlight') {
      highlightInputRef.current?.click();
      return;
    }
    if (value === 'table') {
      insertTable();
      return;
    }
    if (value === 'quote') {
      transformSelection((selected) => toggleLinePrefix(selected, '> '));
      return;
    }
    if (value === 'divider') {
      transformSelection(() => '\n---\n');
      return;
    }
    if (value === 'formula') {
      transformSelection((selected) => `$$\n${selected.trim() || 'E = mc^2'}\n$$`);
    }
  }

  async function uploadImage(file: File) {
    setBusy(true);
    setShowImagePanel(false);
    setMessage('正在上传图片...');
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    const contentBase64 = dataUrl.split(',')[1];
    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, mimeType: file.type, contentBase64 })
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '图片上传失败');
      return;
    }
    transformSelection(() => result.markdown || `![${file.name}](${result.url})`);
    setMessage(`已插入图片：${file.name}`);
  }

  function insertRemoteImage() {
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) {
      setMessage('请输入图片链接');
      return;
    }
    const alt = imageAlt.trim() || 'image';
    transformSelection(() => `![${alt}](${trimmedUrl})`);
    setShowImagePanel(false);
    setImageUrl('');
    setMessage('已插入外链图片 Markdown');
  }

  async function save(targetKind: PostKind = kind) {
    if (!meta.title.trim()) {
      setMessage('标题不能为空');
      return;
    }
    setBusy(true);
    setMessage(targetKind === 'post' ? '正在保存并触发发布...' : '正在保存到草稿...');
    const endpoint = targetKind === 'post' ? '/api/posts' : '/api/drafts';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: targetKind,
        meta: cleanMeta(meta),
        body,
        path: targetKind === kind ? path || undefined : undefined,
        originalPath: targetKind === kind ? initial?.path : undefined,
        sha: targetKind === kind ? sha || undefined : undefined
      })
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || '保存失败');
      return;
    }
    setPath(result.path);
    setSha(result.sha);
    setMessage(`${targetKind === 'post' ? '已保存，GitHub Actions 将自动发布' : '已保存至草稿'}：${result.commit?.sha?.slice(0, 7) || result.sha.slice(0, 7)}`);
    onSaved?.({ path: result.path, sha: result.sha });
  }

  async function remove() {
    if (!path || !sha || !confirm('确认删除这篇内容？')) return;
    setBusy(true);
    const response = await fetch(kind === 'post' ? '/api/posts' : '/api/drafts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, sha })
    });
    setBusy(false);
    if (!response.ok) {
      const result = await response.json();
      setMessage(result.error || '删除失败');
      return;
    }
    onDeleted?.();
  }

  async function publishDraft() {
    if (!path) return;
    setBusy(true);
    setMessage('正在发布草稿...');
    const response = await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, action: 'publish' })
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `已发布：${result.path}` : result.error || '发布失败');
  }

  async function moveToDraft() {
    if (!path || !confirm('确认把这篇文章转为草稿？')) return;
    setBusy(true);
    setMessage('正在转为草稿...');
    const response = await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, action: 'unpublish' })
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `已转为草稿：${result.path}` : result.error || '操作失败');
  }

  return (
    <div className="grid min-w-0 gap-4">
      <section className="apple-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="truncate font-display text-[22px] font-semibold leading-[1.18] tracking-[-0.2px] text-ink">{meta.title || '未命名文章'}</h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-[1.3] tracking-[-0.12px] text-muted">
              <span>仓库：{path || '自动生成'}</span>
              <span>permalink：{meta.permalink || '按 Hexo 默认规则'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setShowMeta((current) => !current)}>
              {showMeta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              信息
            </Button>
            <Button onClick={() => save()} disabled={busy}><Save size={16} />{busy ? '保存中...' : '保存'}</Button>
            {kind === 'post' && !path ? <Button variant="secondary" onClick={() => save('draft')} disabled={busy}><FilePenLine size={16} />保存至草稿</Button> : null}
            {kind === 'draft' && path ? <Button variant="secondary" onClick={publishDraft} disabled={busy}><UploadCloud size={16} />发布</Button> : null}
            {kind === 'post' && path ? <Button variant="secondary" onClick={moveToDraft} disabled={busy}><UploadCloud size={16} />转草稿</Button> : null}
            {path ? <Button variant="danger" onClick={remove} disabled={busy}><Trash2 size={16} />删除</Button> : null}
          </div>
        </div>
        {showMeta ? (
          <div className="grid gap-3 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="标题">
                <TextInput value={meta.title} onChange={(event) => updateMeta('title', event.target.value)} placeholder="我的新文章" />
              </Field>
              <Field label="仓库路径">
                <TextInput value={path} onChange={(event) => setPath(event.target.value)} placeholder={kind === 'post' ? 'source/_posts/my-post.md' : 'source/_drafts/my-draft.md'} />
              </Field>
              <Field label="permalink">
                <TextInput value={String(meta.permalink || '')} onChange={(event) => updateMeta('permalink', event.target.value)} placeholder="posts/my-custom-url/" />
              </Field>
              <Field label="发布日期">
                <TextInput value={meta.date || ''} onChange={(event) => updateMeta('date', event.target.value)} placeholder="2026-05-01T10:00:00.000Z" />
              </Field>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,1.15fr)]">
              <div className="grid gap-3 md:grid-cols-2 xl:col-span-2 xl:grid-cols-2">
                <Field label="标签">
                  <TextInput value={arrayToText(meta.tags)} onChange={(event) => updateMeta('tags', textToArray(event.target.value))} placeholder="逗号分隔" />
                </Field>
                <Field label="分类">
                  <TextInput value={arrayToText(meta.categories)} onChange={(event) => updateMeta('categories', textToArray(event.target.value))} placeholder="逗号分隔" />
                </Field>
                <Field label="priority">
                  <TextInput type="number" value={Number(meta.priority || 0)} onChange={(event) => updateMeta('priority', Number(event.target.value || 0))} />
                </Field>
                <label className="grid content-start items-start gap-1 self-start text-[13px] font-semibold leading-[1.3] tracking-[-0.12px] text-ink">
                  <span>置顶</span>
                  <button type="button" onClick={() => updateMeta('sticky', !meta.sticky)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-[14px] font-normal transition active:scale-95 ${meta.sticky ? 'border-blue bg-blue text-white' : 'border-line bg-canvas text-ink hover:border-blue'}`}>
                    {meta.sticky ? <Pin size={15} /> : <PinOff size={15} />}
                    {meta.sticky ? '已置顶' : '未置顶'}
                  </button>
                </label>
              </div>
              <Field label="摘要" className="xl:self-stretch">
                <TextArea value={String(meta.excerpt || '')} onChange={(event) => updateMeta('excerpt', event.target.value)} className="min-h-[132px] xl:min-h-[141px]" />
              </Field>
            </div>
          </div>
        ) : null}
        {message ? <p className="mx-4 mb-4 apple-message break-all">{message}</p> : null}
      </section>

      <section className="apple-panel overflow-hidden">
        <div className="editor-toolbar-wrap border-b border-line">
          <div className="editor-toolbar editor-toolbar-single-line">
            <ToolbarButton title="撤销" onClick={undo} disabled={!historyRef.current.past.length}><Undo2 size={16} /></ToolbarButton>
            <ToolbarButton title="复原" onClick={redo} disabled={!historyRef.current.future.length}><Redo2 size={16} /></ToolbarButton>
            <ToolbarButton title="格式刷" onClick={applyBrush} active={Boolean(brushStyle)}><Paintbrush2 size={16} /></ToolbarButton>
            <ToolbarButton title="清除样式" onClick={clearStyles}><Eraser size={16} /></ToolbarButton>

            <select className="editor-toolbar-select min-w-[148px]" value={insertValue} onChange={(event) => {
              const value = event.target.value as BlockInsertOption | '';
              setInsertValue(value);
              if (value) insertBlock(value);
            }}>
              <option value="">插入</option>
              {Object.entries(blockInsertLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select className="editor-toolbar-select min-w-[112px]" value={blockValue} onChange={(event) => applyBlockStyle(event.target.value as BlockStyleOption)}>
              <option value="paragraph">正文</option>
              <option value="h1">一级标题</option>
              <option value="h2">二级标题</option>
              <option value="h3">三级标题</option>
              <option value="quote">引用</option>
              <option value="code">代码块</option>
            </select>

            <ToolbarButton title="加粗" onClick={() => transformSelection((selected) => toggleWrap(selected, '**'))}><strong>B</strong></ToolbarButton>
            <ToolbarButton title="斜体" onClick={() => transformSelection((selected) => toggleWrap(selected, '*'))}><Italic size={16} /></ToolbarButton>
            <ToolbarButton title="删除线" onClick={() => transformSelection((selected) => toggleWrap(selected, '~~'))}><Strikethrough size={16} /></ToolbarButton>
            <ToolbarButton title="下划线" onClick={() => transformSelection((selected) => toggleWrap(selected, '<u>', '</u>'))}><Underline size={16} /></ToolbarButton>
            <ToolbarButton title="无序列表" onClick={() => transformSelection((selected) => toggleLinePrefix(selected, '- '))}><List size={16} /></ToolbarButton>
            <ToolbarButton title="有序列表" onClick={() => transformSelection((selected) => toggleOrderedList(selected))}><ListOrdered size={16} /></ToolbarButton>
            <ToolbarButton title="任务列表" onClick={() => transformSelection((selected) => toggleLinePrefix(selected, '- [ ] '))}><ListChecks size={16} /></ToolbarButton>

            <select className="editor-toolbar-select min-w-[96px]" defaultValue="" onChange={(event) => {
              const value = event.target.value as IndentOption | '';
              if (value) changeIndent(value);
              event.target.value = '';
            }}>
              <option value="">缩进</option>
              <option value="increase">增加</option>
              <option value="decrease">减少</option>
            </select>

            <ToolbarButton title="插入图片" onClick={openImagePanel}><ImagePlus size={16} /></ToolbarButton>
            <ToolbarButton title="插入链接" onClick={insertLink}><Link2 size={16} /></ToolbarButton>

            <select className="editor-toolbar-select min-w-[108px] ml-auto" value={overflowAction} onChange={(event) => {
              const value = event.target.value as ToolbarOverflowAction | '';
              setOverflowAction(value);
              if (value) runOverflowAction(value);
            }}>
              <option value="">更多</option>
              <option value="color">字体颜色</option>
              <option value="highlight">突出显示</option>
              <option value="table">插入表格</option>
              <option value="quote">引用</option>
              <option value="divider">分割线</option>
              <option value="formula">公式</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid min-h-[720px] gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="apple-panel overflow-hidden">

          <div className="border-b border-line bg-paper/70 px-4 py-2 text-[12px] leading-[1.35] tracking-[-0.12px] text-muted">
            文档式写作区保留 Markdown 存储，选中文字后可直接用工具栏套用结构与样式。
          </div>

          {showImagePanel ? (
            <div className="border-b border-line bg-canvas px-4 py-4">
              <div className="grid gap-3 rounded-[14px] border border-line bg-paper/65 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold leading-[1.3] tracking-[-0.14px] text-ink">插入图片</div>
                    <div className="mt-1 text-[12px] leading-[1.35] tracking-[-0.12px] text-muted">可选上传本地图片，或输入外链地址后自动转成 Markdown 图片语法。</div>
                  </div>
                  <div className="inline-flex rounded-full border border-line bg-canvas p-1">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`rounded-full px-4 py-2 text-[13px] transition ${imageMode === 'upload' ? 'bg-blue text-white' : 'text-muted hover:text-ink'}`}
                    >
                      上传图片
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('link')}
                      className={`rounded-full px-4 py-2 text-[13px] transition ${imageMode === 'link' ? 'bg-blue text-white' : 'text-muted hover:text-ink'}`}
                    >
                      外链图片
                    </button>
                  </div>
                </div>

                <Field label="图片说明">
                  <TextInput value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="可选，作为 alt 文本写入 Markdown" />
                </Field>

                {imageMode === 'upload' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => imageInputRef.current?.click()} disabled={busy}>
                      <ImagePlus size={16} />
                      选择并上传图片
                    </Button>
                    <Button variant="ghost" onClick={closeImagePanel}>取消</Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <Field label="图片链接">
                      <TextInput value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/cover.png" />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={insertRemoteImage}>
                        <Link2 size={16} />
                        转成 Markdown 图片
                      </Button>
                      <Button variant="ghost" onClick={closeImagePanel}>取消</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="p-4">
            <TextArea
              ref={editorRef}
              value={body}
              onChange={(event) => handleBodyChange(event.target.value)}
              onPaste={handleEditorPaste}
              onSelect={updateSelectionFromEditor}
              onClick={updateSelectionFromEditor}
              onKeyUp={updateSelectionFromEditor}
              className="editor-document min-h-[620px] border-0 bg-transparent px-0 py-0 font-['SF_Pro_Text',system-ui,sans-serif] text-[16px] leading-[1.8] tracking-[-0.18px] shadow-none focus:border-transparent focus:ring-0"
              placeholder="在这里像写文档一样写文章，工具栏会自动帮你插入 Markdown 结构..."
            />
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file);
              event.target.value = '';
            }}
          />
          <input
            ref={colorInputRef}
            type="color"
            className="hidden"
            onChange={(event) => insertColor(event.target.value)}
          />
          <input
            ref={highlightInputRef}
            type="color"
            className="hidden"
            value="#fff2a8"
            onChange={(event) => insertHighlight(event.target.value)}
          />
        </div>

        <article className="preview-shell">
          <div className="preview-head">
            <div>
              <div className="preview-kicker">实时预览</div>
              <h3 className="preview-title">{meta.title || '未命名文章'}</h3>
            </div>
            <div className="preview-meta">
              <span>{meta.date ? new Date(meta.date).toLocaleString('zh-CN') : '未设置时间'}</span>
              <span>{meta.tags?.length ? `标签：${meta.tags.join(' / ')}` : '无标签'}</span>
            </div>
          </div>
          <div className="preview-paper">
            <article className="prose-preview min-h-[620px]" dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </article>
      </section>
    </div>
  );
}

export function PostList({ posts, activePath, kind, onSelect, onReorder, onOrderMeta }: { posts: PostSummary[]; activePath?: string; kind: PostKind; onSelect: (post: PostSummary) => void; onReorder: (paths: string[]) => void; onOrderMeta: (post: PostSummary, meta: { priority?: number; sticky?: boolean; save?: boolean }) => void }) {
  const [query, setQuery] = useState('');
  const [dragPath, setDragPath] = useState<string | null>(null);
  const filtered = posts.filter((post) => `${post.meta.title} ${post.path} ${post.meta.permalink || ''} ${post.meta.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  function moveBefore(targetPath: string) {
    if (!dragPath || dragPath === targetPath || query.trim()) return;
    const next = posts.filter((post) => post.path !== dragPath);
    const targetIndex = next.findIndex((post) => post.path === targetPath);
    const dragged = posts.find((post) => post.path === dragPath);
    if (!dragged || targetIndex < 0) return;
    next.splice(targetIndex, 0, dragged);
    onReorder(next.map((post) => post.path));
  }

  return (
    <aside className="apple-panel overflow-hidden xl:sticky xl:top-[104px]">
      <div className="border-b border-line p-3">
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、路径、标签" />
      </div>
      <div className="max-h-[calc(100vh-190px)] overflow-auto p-2">
        {filtered.map((post) => (
          <div key={post.path} draggable={!query.trim()} onDragStart={() => setDragPath(post.path)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveBefore(post.path)} onDragEnd={() => setDragPath(null)} className={`mb-2 rounded-[10px] border p-2 transition hover:border-blue ${activePath === post.path ? 'border-blue bg-paper' : dragPath === post.path ? 'border-blue/50 bg-paper/70 opacity-70' : 'border-transparent hover:bg-paper'}`}>
            <div className="flex items-start gap-2">
              <button type="button" className="mt-0.5 grid h-7 w-7 shrink-0 cursor-grab place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label="拖动排序">
                <GripVertical size={15} />
              </button>
              <button type="button" onClick={() => onSelect(post)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  {post.meta.sticky ? <Pin size={13} className="shrink-0 text-blue" /> : null}
                  <span className="truncate text-[15px] font-semibold leading-[1.25] tracking-[-0.18px] text-ink">{post.meta.title}</span>
                </div>
                <div className="mt-1 truncate text-[12px] leading-none tracking-[-0.12px] text-muted">{post.meta.permalink || post.path}</div>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 pl-9">
              <input type="number" value={Number(post.meta.priority || 0)} onChange={(event) => {
                const priority = Number(event.target.value || 0);
                onOrderMeta(post, { priority, save: false });
              }} onBlur={(event) => onOrderMeta(post, { priority: Number(event.target.value || 0), save: true })} onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }} className="h-8 w-20 rounded-full border border-line bg-canvas px-3 text-[12px] text-ink outline-none focus:border-blueFocus focus:ring-2 focus:ring-blueFocus/20" aria-label="priority" />
              {kind === 'post' ? (
                <button type="button" onClick={() => onOrderMeta(post, { sticky: !post.meta.sticky })} className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] transition ${post.meta.sticky ? 'border-blue bg-blue text-white' : 'border-line bg-canvas text-muted hover:border-blue hover:text-ink'}`}>
                  {post.meta.sticky ? <Pin size={13} /> : <PinOff size={13} />}
                  置顶
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
