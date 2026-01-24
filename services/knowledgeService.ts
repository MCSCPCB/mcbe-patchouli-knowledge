import axios from 'axios';
import { supabase } from './supabaseClient';
import { KnowledgeItem, User, Attachment } from '../types';

/**
 * 数据库行结构 (Internal DB Representation)
 * 这里必须严格对应 init.sql 的表结构
 */
interface DBPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  tags: string[];      // 修正: 对应 init.sql 的 tags
  attachments: any;
  search_clues: string; // 对应 init.sql 的 search_clues
  status: 'pending' | 'published' | 'rejected'; // 修正: 对应新的枚举
  created_at: string;
  profiles?: {
    github_id: string;
    avatar_url: string;
  };
}

// === AI 功能 ===

export const generateSearchClues = async (content: string): Promise<string> => {
  try {
    const response = await axios.post('/api/generate_clues', { content });
    return response.data.clues;
  } catch (error) {
    console.error('Failed to generate clues:', error);
    return '';
  }
};

// === 核心检索功能 ===

export const searchKnowledge = async (query: string, mode: 'keyword' | 'ai' = 'keyword'): Promise<KnowledgeItem[]> => {
  let searchTerms = query;

  if (mode === 'ai') {
    try {
      const { data } = await axios.post('/api/search_intent', { query });
      if (data.searchStr) {
        searchTerms = data.searchStr;
      }
    } catch (e) {
      console.warn('AI intent analysis failed, falling back to keyword search');
    }
  }

  // 1. 全文检索 (针对 search_clues)
  let { data, error } = await supabase
    .from('knowledge_posts')
    .select(`*, profiles ( github_id, avatar_url )`)
    .eq('status', 'published') // 修正: 只查询已发布的
    .textSearch('search_clues', searchTerms, {
      type: 'websearch',
      config: 'english'
    });

  // 2. 降级策略: 标题模糊匹配
  if (!data || data.length === 0) {
    const fallback = await supabase
      .from('knowledge_posts')
      .select(`*, profiles ( github_id, avatar_url )`)
      .eq('status', 'published')
      .ilike('title', `%${query}%`);
    
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data as DBPost[] || []).map(mapDBToItem);
};

// === CRUD 功能 ===

export const getRecentPosts = async (): Promise<KnowledgeItem[]> => {
  const { data, error } = await supabase
    .from('knowledge_posts')
    .select(`*, profiles ( github_id, avatar_url )`)
    .eq('status', 'published') // 修正: 只看 published
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data as DBPost[]).map(mapDBToItem);
};

export const createPost = async (
  item: Omit<KnowledgeItem, 'id' | 'author' | 'status' | 'createdAt'>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 修正: 插入时映射字段
  const { error } = await supabase.from('knowledge_posts').insert({
    author_id: user.id,
    title: item.title,
    content: item.content,
    tags: item.tags, // 修正: 存入 tags
    attachments: item.attachments,
    search_clues: item.aiClues, // 修正: aiClues -> search_clues
    status: 'pending'
  });

  if (error) throw error;
};

// === 管理员功能 ===

export const getPendingPosts = async (): Promise<KnowledgeItem[]> => {
  const { data, error } = await supabase
    .from('knowledge_posts')
    .select(`*, profiles ( github_id, avatar_url )`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DBPost[]).map(mapDBToItem);
};

export const approvePost = async (postId: string) => {
  const { error } = await supabase
    .from('knowledge_posts')
    .update({ status: 'published' }) // 修正: 使用 published
    .eq('id', postId);

  if (error) throw error;
};

export const rejectPost = async (postId: string) => {
  const { error } = await supabase
    .from('knowledge_posts')
    .update({ status: 'rejected' }) // 修正: 使用 rejected 而不是 delete
    .eq('id', postId);

  if (error) throw error;
};

export const deletePost = async (postId: string) => {
  const { error } = await supabase
    .from('knowledge_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
};

// === 用户管理 ===

export const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.github_id || 'Unknown',
    avatar: p.avatar_url || '',
    role: p.role,
    banned: p.is_banned // 修正: is_banned -> banned
  }));
};

export const toggleUserBan = async (userId: string, isBanned: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: isBanned })
    .eq('id', userId);

  if (error) throw error;
};

// === Data Mapper (转换器) ===
// 将数据库的下划线命名转换为前端的驼峰命名
function mapDBToItem(row: DBPost): KnowledgeItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags || [], // 修正: 映射 tags
    aiClues: row.search_clues, // 修正: search_clues -> aiClues
    attachments: row.attachments || [],
    status: row.status,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      name: row.profiles?.github_id || 'Unknown',
      avatar: row.profiles?.avatar_url || '',
      role: 'user' // 这里简化处理，列表页通常不需要知道作者是不是 admin
    }
  };
}
