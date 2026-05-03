export type PostKind = 'post' | 'draft';

export type FrontMatterValue = string | number | boolean | string[] | null | undefined;

export type PostMeta = {
  title: string;
  date?: string;
  updated?: string;
  tags: string[];
  categories: string[];
  excerpt?: string;
  cover?: string;
  permalink?: string;
  priority?: number;
  sticky?: number | boolean;
  [key: string]: FrontMatterValue;
};

export type PostSummary = {
  path: string;
  name: string;
  sha: string;
  kind: PostKind;
  meta: PostMeta;
  updatedAt?: string;
  size?: number;
};

export type PostContent = PostSummary & {
  body: string;
  raw: string;
};

export type SavePostInput = {
  path?: string;
  originalPath?: string;
  sha?: string;
  kind: PostKind;
  meta: PostMeta;
  body: string;
  message?: string;
};
