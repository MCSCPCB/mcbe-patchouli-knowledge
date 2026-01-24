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
  aiClues?: string; // AI generated search keywords
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'link' | 'file';
  url: string;
}

export enum Page {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  CREATE = 'CREATE',
  DETAIL = 'DETAIL',
  ADMIN = 'ADMIN',
}

const envTags = import.meta.env.VITE_ALLOWED_TAGS;

export const PREDEFINED_TAGS = envTags 
  ? envTags.split(',').map(t => t.trim()) 
  : [];

// Design System Types
export type Variant = 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';
export type Color = 'primary' | 'secondary' | 'error' | 'surface';
