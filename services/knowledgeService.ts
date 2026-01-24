import axios from 'axios';
import { supabase } from './supabaseClient';
import type { KnowledgePost, KnowledgeType, UserProfile } from '../types';

/**
 * 数据库行数据接口 (内部使用，对应 Supabase 表结构)
 */
interface DBPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  type: KnowledgeType;
  attachments: any;
  search_clues: string;
  status: 'pending' | 'reviewed';
  created_at: string;
  profiles?: {
    github_id: string;
    avatar_url: string;
  };
}

// === AI 功能 ===

/**
 * 调用后端 API 生成检索线索
 */
export const generateSearchClues = async (content: string): Promise<string> => {
  try {
    const response = await axios.post('/api/generate_clues', { content });
    return response.data.clues;
  } catch (error) {
    console.error('Failed to generate clues:', error);
    return ''; // 如果失败，返回空字符串让用户手动填
  }
};

/**
 * 智能检索 (核心功能)
 * 1. AI 分析意图 -> SQL 搜索串
 * 2. 数据库全文检索
 * 3. 结果降级处理
 */
export const searchKnowledge = async (query: string, mode: 'keyword' | 'ai' = 'keyword'): Promise<KnowledgePost[]> => {
  let searchTerms = query;

  // 1. 如果是 AI 模式，先去后端分析意图
  if (mode === 'ai') {
    try {
      const { data } = await axios.post('/api/search_intent', { query });
      if (data.searchStr) {
        searchTerms = data.searchStr;
        console.log(`[AI Search] Converted "${query}" to "${searchTerms}"`);
      }
    } catch (e) {
      console.warn('AI intent analysis failed, falling back to keyword search');
    }
  }

  // 2. 执行数据库检索
  let { data, error } = await supabase
    .from('knowledge_posts')
    .select(`
      *,
      profiles ( github_id, avatar_url )
    `)
    .eq('status', 'reviewed') // 只能搜到已审核的
    .textSearch('search_clues', searchTerms, {
      type: 'websearch',
      config: 'english'
    });

  // 3. 降级策略：如果 AI/高级搜索没结果，尝试简单的标题模糊匹配
  if (!data || data.length === 0) {
    console.log('[Search] No results found, falling back to title ILIKE');
    const fallback = await supabase
      .from('knowledge_posts')
      .select(`*, profiles ( github_id, avatar_url )`)
      .eq('status', 'reviewed')
      .ilike('title', `%${query}%`);
    
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data as DBPost[] || []).map(mapDBToPost);
};

// === 常规 CRUD 功能 ===

export const getRecentPosts = async (): Promise<KnowledgePost[]> => {
  const { data, error } = await supabase
    .from('knowledge_posts')
    .select(`*, profiles ( github_id, avatar_url )`)
    .eq('status', 'reviewed')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data as DBPost[]).map(mapDBToPost);
};

export const createPost = async (
  post: Omit<KnowledgePost, 'id' | 'authorId' | 'authorName' | 'authorAvatar' | 'status' | 'createdAt'>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('knowledge_posts').insert({
    author_id: user.id,
    title: post.title,
    content: post.content,
    type: post.type,
    attachments: post.attachments,
    search_clues: post.searchClues,
    status: 'pending' // 默认待审核
  });

  if (error) throw error;
};

export const uploadFile = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('kb-assets') // 确保你在 Supabase 创建了这个 bucket
    .upload(fileName, file);

  if (error) throw error;
  
  // 获取公开链接
  const { data: { publicUrl } } = supabase.storage
    .from('kb-assets')
    .getPublicUrl(fileName);
    
  return publicUrl;
};

// === 工具函数 ===

// 将数据库下划线字段映射回前端驼峰字段
function mapDBToPost(row: DBPost): KnowledgePost {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    searchClues: row.search_clues,
    attachments: row.attachments || [],
    authorId: row.author_id,
    authorName: row.profiles?.github_id || 'Unknown',
    authorAvatar: row.profiles?.avatar_url || '',
    status: row.status,
    createdAt: row.created_at
  };
}

// === 管理员功能 (Admin Only) ===

/**
 * 获取所有待审核的投稿
 */
export const getPendingPosts = async (): Promise<KnowledgePost[]> => {
  const { data, error } = await supabase
    .from('knowledge_posts')
    .select(`*, profiles ( github_id, avatar_url )`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DBPost[]).map(mapDBToPost);
};

/**
 * 审核通过投稿
 */
export const approvePost = async (postId: string) => {
  const { error } = await supabase
    .from('knowledge_posts')
    .update({ status: 'reviewed' })
    .eq('id', postId);

  if (error) throw error;
};

/**
 * 删除投稿 (拒绝审核或管理员删帖)
 */
export const deletePost = async (postId: string) => {
  const { error } = await supabase
    .from('knowledge_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
};

/**
 * 获取用户列表
 */
export const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.github_id,
    avatar: p.avatar_url,
    role: p.role,
    isBanned: p.is_banned
  }));
};

/**
 * 封禁/解封用户
 */
export const toggleUserBan = async (userId: string, isBanned: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: isBanned })
    .eq('id', userId);

  if (error) throw error;
};

