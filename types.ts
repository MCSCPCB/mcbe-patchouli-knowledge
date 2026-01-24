export enum Page {
  HOME = 'home',
  EDITOR = 'editor',
  DETAIL = 'detail',
  LOGIN = 'login',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
  isBanned?: boolean; // 新增字段：用于封禁功能
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export type ItemType = 'script' | 'block' | 'entity';

export interface Item {
  id: string;
  title: string;
  author: User;
  content: string;
  type: ItemType;
  attachments: Attachment[];
  aiClues: string; // 对应数据库的 search_clues
  status: 'pending' | 'reviewed';
  createdAt: string;
}

// === 兼容层：为了让 knowledgeService.ts 能正常工作 ===
// 后端服务使用 KnowledgePost 这个名字，这里做个别名映射
export type KnowledgePost = {
  id: string;
  title: string;
  content: string;
  type: ItemType;
  attachments: Attachment[];
  searchClues: string; // 映射到 aiClues
  status: 'pending' | 'reviewed';
  createdAt: string;
  authorId: string;    // 扁平化字段
  authorName: string;  // 扁平化字段
  authorAvatar: string; // 扁平化字段
};

export type KnowledgeType = ItemType;
