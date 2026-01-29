export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'user';
  banned?: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'published' | 'pending' | 'rejected';
  author: User;
  createdAt: string;
  aiClues?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'link' | 'file';
  url: string;
}

// === 修改点：移除了 Page 枚举，它已经被路由 URL 取代 ===

const envTags = import.meta.env.VITE_ALLOWED_TAGS;

export const PREDEFINED_TAGS = envTags 
  ? envTags.split(',').map((t: string) => t.trim()) 
  : [];

export type Variant = 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';
export type Color = 'primary' | 'secondary' | 'error' | 'surface';
