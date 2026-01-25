import axios from 'axios';
import { supabase } from './supabaseClient';
import { KnowledgeItem, User, Attachment } from '../types';
import imageCompression from 'browser-image-compression';

/**
 * 数据库行结构
 */
interface DBPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  tags: string[];      
  attachments: any;
  search_clues: string;
  embedding?: number[]; // 向量字段
  status: 'pending' | 'published' | 'rejected';
  created_at: string;
  profiles?: {
    github_id: string;
    avatar_url: string;
  };
}

// === AI 功能 ===

export const generateSearchClues = async (content: string): Promise<{ clues: string, embedding?: number[] }> => {
  try {
    const response = await axios.post('/api/generate_clues', { content });
    return {
      clues: response.data.clues,         // 火山引擎生成的文本线索
      embedding: response.data.embedding  // 硅基流动生成的向量
    };
  } catch (error) {
    console.error('Failed to generate clues:', error);
    return { clues: '' };
  }
};

// === 核心检索功能 ===

export const searchKnowledge = async (query: string, mode: 'keyword' | 'ai' = 'keyword'): Promise<KnowledgeItem[]> => {
  
  let searchTerms = query; // 默认为原始查询
  
  // AI 增强模式：向量检索 + 意图优化
  if (mode === 'ai') {
    try {
      // 调用双核接口
      const { data: intentData } = await axios.post('/api/search_intent', { query });
      
      // 1. 尝试向量检索
      if (intentData.embedding) {
        const { data, error } = await supabase.rpc('match_knowledge', {
          query_embedding: intentData.embedding,
          match_threshold: 0.5,
          match_count: 20
        });

        if (!error && data && data.length > 0) {
           // 如果向量搜到了结果，补充用户信息后返回
           const ids = data.map((d: any) => d.id);
           const { data: fullData } = await supabase
               .from('knowledge_posts')
               .select(`*, profiles ( github_id, avatar_url )`)
               .in('id', ids);
           
           if (fullData) {
             // 保持向量相似度排序
             const sorted = ids.map((id: string) => fullData.find((item: any) => item.id === id)).filter(Boolean);
             return (sorted as DBPost[]).map(mapDBToItem);
           }
        }
      }

      // 2. 如果向量没结果，使用 AI 优化过的关键词 (searchStr)
      if (intentData.searchStr) {
        searchTerms = intentData.searchStr;
      }

    } catch (e) {
      console.warn('AI search enhancement failed, falling back to raw keyword', e);
    }
  }

  // === 传统检索 (关键词/降级) ===
  
  // 1. 全文检索 (针对 search_clues 和内容)
  // 使用 'simple' 配置以兼容多语言，搜索范围包括 AI 生成的 searchTerms
  let { data, error } = await supabase
    .from('knowledge_posts')
    .select(`*, profiles ( github_id, avatar_url )`)
    .textSearch('search_clues', searchTerms, {
      type: 'websearch',
      config: 'simple' 
    });

  // 2. 降级策略: 模糊匹配 (使用原始 query 以防分词错误)
  if (!data || data.length === 0) {
    const fallback = await supabase
      .from('knowledge_posts')
      .select(`*, profiles ( github_id, avatar_url )`)
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,search_clues.ilike.%${query}%`);
    
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

  // 发布前检查：如果还没有向量，强制生成一次 (利用双核接口)
  // 这里的 item.aiClues 可能是用户手动改过的文本，我们保留它
  // 但我们需要重新生成一次 embedding 来确保数据有向量
  let finalEmbedding = undefined;
  let finalClues = item.aiClues;

  try {
     const aiResult = await generateSearchClues(`${item.title}\n${item.content}`);
     finalEmbedding = aiResult.embedding;
     // 如果用户没填线索，就用 AI 生成的
     if (!finalClues) finalClues = aiResult.clues; 
  } catch (e) {
     console.warn('Auto-embedding generation failed on create', e);
  }

  const { error } = await supabase.from('knowledge_posts').insert({
    author_id: user.id,
    title: item.title,
    content: item.content,
    tags: item.tags,
    attachments: item.attachments,
    search_clues: finalClues, 
    embedding: finalEmbedding, // 存入向量
    status: 'pending'
  });

  if (error) throw error;
};

// === 管理员功能 (保持不变) ===

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
    .update({ status: 'published' })
    .eq('id', postId);

  if (error) throw error;
};

export const rejectPost = async (postId: string) => {
  const { error } = await supabase
    .from('knowledge_posts')
    .update({ status: 'rejected' })
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

// === 用户管理 (保持不变) ===

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
    banned: p.is_banned
  }));
};

export const toggleUserBan = async (userId: string, isBanned: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: isBanned })
    .eq('id', userId);

  if (error) throw error;
};

// === Data Mapper ===
function mapDBToItem(row: DBPost): KnowledgeItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags || [],
    aiClues: row.search_clues, 
    attachments: row.attachments || [],
    status: row.status,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      name: row.profiles?.github_id || 'Unknown',
      avatar: row.profiles?.avatar_url || '',
      role: 'user'
    }
  };
};

// === 文件上传 (保持不变) ===

const ALLOWED_ATTACHMENT_EXTENSIONS = [
  'txt', 'json', 'md', 'csv', 'py', 'js', 'ts', 'html', 'css', 'sql', 'log', 'xml', 'yml', 'yaml'
];

export const uploadFile = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (!ext || !ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    throw new Error(`Forbidden file type: .${ext}. Only text-based files (txt, json, code) are allowed.`);
  }

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

export const uploadImage = async (file: File): Promise<string> => {
  try {
    const originalFile = file;
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(originalFile);
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); 
      };
      reader.onerror = (e) => reject(new Error("File reading failed"));
    });

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const randomName = `${crypto.randomUUID()}.${ext}`;

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
    let errorMsg = 'Failed to upload image';
    if (axios.isAxiosError(error) && error.response) {
       errorMsg = `Server Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
    } else if (error instanceof Error) {
       errorMsg = error.message;
    }
    throw new Error(errorMsg);
  }
};

// === 更新文章 (含向量更新) ===
export const updatePost = async (id: string, updates: Partial<KnowledgeItem>) => {
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.tags) dbUpdates.tags = updates.tags;
  if (updates.aiClues) dbUpdates.search_clues = updates.aiClues;
  if (updates.attachments) dbUpdates.attachments = updates.attachments;
  
  // 如果关键内容变化，尝试重新生成向量和线索
  if (updates.title || updates.content) {
      const textToEmbed = `${updates.title || ''}\n${updates.content || ''}`;
      if (textToEmbed.trim().length > 5) {
         try {
             // 重新调用双核生成，更新向量
             const aiResult = await generateSearchClues(textToEmbed);
             if (aiResult.embedding) {
                 dbUpdates.embedding = aiResult.embedding;
             }
             // 如果用户没有明确修改线索，且 AI 生成了新线索，是否自动更新？
             // 这里保守策略：只更新向量，除非 updates.aiClues 为空
             if (!updates.aiClues && aiResult.clues) {
                 dbUpdates.search_clues = aiResult.clues;
             }
         } catch (e) {
             console.warn('Failed to update embedding', e);
         }
      }
  }
  
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('knowledge_posts')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
};
