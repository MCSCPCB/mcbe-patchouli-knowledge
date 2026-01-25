import axios from 'axios';
import { supabase } from './supabaseClient';
import { KnowledgeItem, User, Attachment } from '../types';
import imageCompression from 'browser-image-compression';

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
};

// === 文件上传逻辑修改 ===

// 允许的附件类型白名单 (纯文本类)
const ALLOWED_ATTACHMENT_EXTENSIONS = [
  'txt', 'json', 'md', 'csv', 'py', 'js', 'ts', 'html', 'css', 'sql', 'log', 'xml', 'yml', 'yaml'
];

/**
 * 上传普通附件到 Supabase (受严格类型限制)
 */
export const uploadFile = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (!ext || !ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    throw new Error(`Forbidden file type: .${ext}. Only text-based files (txt, json, code) are allowed.`);
  }

  // 1. 简单的文件名清洗
  const cleanName = file.name.replace(/[^\x00-\x7F]/g, "").replace(/\s/g, '_'); 
  const fileName = `${Date.now()}_${cleanName}`;
  
  const { data, error } = await supabase.storage
    .from('kb-assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      duplex: 'half'
    });

  if (error) {
    console.error("Supabase Upload Error:", error);
    throw error;
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('kb-assets')
    .getPublicUrl(fileName);
    
  return publicUrl;
};

/**
 * 上传图片到 GitHub
 */
export const uploadImage = async (file: File): Promise<string> => {
  try {
    // 步骤 A: 直接使用原始文件（跳过压缩步骤）
    const originalFile = file;

    // 步骤 B: 转换为 Base64
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(originalFile);
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // 移除 data:image/png;base64, 前缀，GitHub API 不需要它
        resolve(base64.split(',')[1]); 
      };
      reader.onerror = (e) => reject(new Error("File reading failed"));
    });

    // 步骤 C: 生成随机文件名 (规避审查 + 防止重名)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const randomName = `${crypto.randomUUID()}.${ext}`;

    // 步骤 D: 调用后端 API 代理上传
    const response = await axios.post('/api/upload_github', {
      content: base64Content,
      fileName: randomName
    });

    if (!response.data || !response.data.url) {
      throw new Error('Server response missing URL');
    }

    return response.data.url;

  } catch (error: any) {
    console.error('Image Upload Error:', error);
    
    // 生成友好的错误提示
    let errorMsg = 'Failed to upload image';
    if (axios.isAxiosError(error) && error.response) {
       // 如果是服务器明确返回错误（比如 400/500）
       errorMsg = `Server Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
    } else if (error instanceof Error) {
       errorMsg = error.message;
    }

    throw new Error(errorMsg);
  }
};


// === 新增：更新文章 ===
export const updatePost = async (id: string, updates: Partial<KnowledgeItem>) => {
  // 映射前端字段到数据库字段
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.tags) dbUpdates.tags = updates.tags;
  if (updates.aiClues) dbUpdates.search_clues = updates.aiClues;
  if (updates.attachments) dbUpdates.attachments = updates.attachments;
  
  // 总是更新时间
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('knowledge_posts')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
};
