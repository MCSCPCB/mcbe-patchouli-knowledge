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
 * 上传图片到 GitHub (经过压缩处理)
 */
/**
 * 上传图片到 GitHub
 */
/**
 * 上传图片到 GitHub
 */
export const uploadImage = async (file: File): Promise<string> => {
  console.log('上传图片开始:', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    fileType: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  });

  try {
    // 直接读取文件为 Base64（不压缩）
    console.log('开始读取文件为Base64...');
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadstart = () => console.log('FileReader: 开始读取文件');
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total * 100).toFixed(2);
          console.log(`FileReader: 读取进度 ${percent}%`);
        }
      };
      
      reader.onloadend = () => {
        console.log('FileReader: 读取完成');
        try {
          const base64 = reader.result as string;
          console.log('Base64数据长度:', base64.length, '字符');
          
          // 检查Base64数据是否有效
          if (!base64 || base64.length < 100) {
            console.error('Base64数据过短或无效');
            reject(new Error('Base64数据无效'));
            return;
          }
          
          // 移除 data:image/png;base64, 前缀
          const contentOnly = base64.split(',')[1];
          if (!contentOnly) {
            console.error('无法分割Base64数据');
            reject(new Error('Base64格式错误'));
            return;
          }
          
          console.log('处理后的Base64长度:', contentOnly.length, '字符');
          resolve(contentOnly);
        } catch (error) {
          console.error('FileReader回调错误:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader错误:', error);
        reject(new Error(`文件读取失败: ${reader.error?.message || '未知错误'}`));
      };
      
      reader.onabort = () => {
        console.warn('FileReader: 读取被中止');
        reject(new Error('文件读取被中止'));
      };
      
      reader.readAsDataURL(file);
    });

    console.log('Base64内容前100字符:', base64Content.substring(0, 100) + '...');

    // 生成随机文件名
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const randomName = `${crypto.randomUUID()}.${ext}`;
    
    console.log('生成的文件名:', randomName);
    console.log('准备调用上传API...');

    // 检查文件大小
    const base64Size = (base64Content.length * 3) / 4; // Base64大致大小估算
    console.log('Base64编码后大致大小:', `${(base64Size / 1024).toFixed(2)} KB`);
    
    if (base64Size > 5 * 1024 * 1024) { // 5MB限制
      console.warn('文件过大，可能超过GitHub API限制');
    }

    // 调用后端 API 代理上传
    const response = await axios.post('/api/upload_github', {
      content: base64Content,
      fileName: randomName
    }, {
      timeout: 30000, // 30秒超时
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('API响应状态:', response.status);
    console.log('API响应数据:', response.data);
    
    if (!response.data || !response.data.url) {
      console.error('API响应缺少URL字段');
      throw new Error('服务器响应无效');
    }

    console.log('上传成功，URL:', response.data.url);
    return response.data.url;
    
  } catch (error) {
    console.error('=== 上传图片详细错误日志 ===');
    console.error('错误类型:', error.constructor.name);
    
    if (axios.isAxiosError(error)) {
      console.error('Axios错误详情:');
      console.error('请求配置:', error.config);
      console.error('响应状态:', error.response?.status);
      console.error('响应数据:', error.response?.data);
      console.error('响应头:', error.response?.headers);
      console.error('请求头:', error.request?.headers);
    } else if (error instanceof Error) {
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    } else {
      console.error('未知错误对象:', error);
    }
    
    console.error('=== 错误日志结束 ===');
    
    // 提供更详细的错误消息
    let errorMessage = 'Failed to upload image';
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `服务器错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
      } else if (error.request) {
        errorMessage = '无法连接到服务器，请检查网络';
      } else {
        errorMessage = `请求配置错误: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
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
