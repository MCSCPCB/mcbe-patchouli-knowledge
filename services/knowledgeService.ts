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

/**
 * 内部辅助函数：获取完整的 AI 数据 (线索 + 向量)
 */
const _fetchCluesAndEmbedding = async (content: string): Promise<{ clues: string, embedding?: number[] }> => {
  try {
    const response = await axios.post('/api/generate_clues', { content });
    return {
      clues: response.data.clues,
      embedding: response.data.embedding
    };
  } catch (error) {
    console.error('Failed to generate clues/embedding:', error);
    return { clues: '' };
  }
};

/**
 * 公开给 UI 使用的函数
 * 修正：只返回字符串，解决 UI 显示 [object Object] 的问题
 */
export const generateSearchClues = async (content: string): Promise<string> => {
  const data = await _fetchCluesAndEmbedding(content);
  return data.clues || ''; // 只返回文本线索
};

// === 核心检索功能 ===

export const searchKnowledge = async (query: string, mode: 'keyword' | 'ai' = 'keyword'): Promise<KnowledgeItem[]> => {
  
  let searchTerms = query;

  // AI 增强模式：向量检索 + 意图优化
  if (mode === 'ai') {
    try {
      const { data: intentData } = await axios.post('/api/search_intent', { query });
      
      // 1. 优先尝试向量检索
      if (intentData.embedding) {
        const { data, error } = await supabase.rpc('match_knowledge', {
          query_embedding: intentData.embedding,
          match_threshold: 0.5,
          match_count: 20
        });

        // 如果向量检索成功且有结果
        if (!error && data && data.length > 0) {
           const ids = data.map((d: any) => d.id);
           const { data: fullData } = await supabase
               .from('knowledge_posts')
               .select(`*, profiles ( github_id, avatar_url )`)
               .in('id', ids);
           
           if (fullData) {
             const sorted = ids.map((id: string) => fullData.find((item: any) => item.id === id)).filter(Boolean);
             return (sorted as DBPost[]).map(mapDBToItem);
           }
        }
      }

      // 2. 如果向量没结果，使用 AI 优化过的关键词
      if (intentData.searchStr) {
        searchTerms = intentData.searchStr;
      }
    } catch (e) {
      console.warn('AI search failed, falling back to keyword', e);
    }
  }

  // === 关键词/降级检索 ===
  
  // 1. 全文检索
  let { data, error } = await supabase
    .from('knowledge_posts')
    .select(`*, profiles ( github_id, avatar_url )`)
    .textSearch('search_clues', searchTerms, {
      type: 'websearch',
      config: 'simple' 
    });

  // 2. 模糊匹配降级
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

  // 核心修改：在提交时，重新调用 API 获取向量 (和线索)
  // 虽然这会产生一次额外的 API 调用，但能确保：
  // 1. 向量一定存在
  // 2. 向量是基于最终提交的 Title + Content 生成的 (比 UI 上生成的更准)
  let finalEmbedding = undefined;
  let finalClues = item.aiClues;

  try {
     const aiData = await _fetchCluesAndEmbedding(`${item.title}\n${item.content}`);
     finalEmbedding = aiData.embedding;
     // 如果用户界面没填线索，使用 AI 生成的
     if (!finalClues) finalClues = aiData.clues;
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

// ... (以下函数保持不变) ...

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


/**
 * 彻底删除文章（级联删除 Supabase 附件）
 * 注意：GitHub 图片由于权限和安全性原因，不在此处自动删除，建议定期手动清理或忽略。
 */
export const deletePost = async (postId: string) => {
  // 1. 获取文章详情 (我们需要 attachments 字段)
  const { data: post, error: fetchError } = await supabase
    .from('knowledge_posts')
    .select('attachments')
    .eq('id', postId)
    .single();

  if (fetchError) {
    // 如果连文章都找不到，直接抛错，别往下走了
    throw new Error('Post not found or permission denied.');
  }

  // 2. 清理 Supabase Storage 附件
  if (post?.attachments && Array.isArray(post.attachments)) {
    const filesToRemove: string[] = [];
    
    post.attachments.forEach((att: any) => {
      if (att.url) {
        // 核心修正：精准提取文件名
        // 假设 URL 是: https://proj.supabase.co/storage/v1/object/public/kb-assets/171569_test.txt
        // 或者相对路径: 171569_test.txt
        
        // 方法：先解码 URL (处理空格等特殊字符)，然后取最后一段
        try {
            const decodedUrl = decodeURIComponent(att.url);
            const fileName = decodedUrl.split('/').pop(); 
            
            // 只有当文件名看起来像我们上传的格式 (时间戳_名字) 时才删，防止误删
            if (fileName && fileName.includes('_')) {
                filesToRemove.push(fileName);
            }
        } catch (e) {
            console.warn('Failed to parse attachment URL:', att.url);
        }
      }
    });

    if (filesToRemove.length > 0) {
      // 不等待结果，后台执行删除，以免阻塞用户体验
      // 即使删除失败也没关系，因为是孤儿文件
      supabase.storage.from('kb-assets').remove(filesToRemove)
        .then(({ error }) => {
            if (error) console.error('Failed to cleanup files:', error);
            else console.log('Cleaned up files:', filesToRemove);
        });
    }
  }

  // 3. 删除数据库记录
  const { error, count } = await supabase
    .from('knowledge_posts')
    .delete({ count: 'exact' })
    .eq('id', postId);

  if (error) throw error;
  
  if (count === 0) {
     throw new Error('Deletion failed. Permission denied or post already deleted.');
  }
};



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

// === 文件上传 ===

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

// === 更新文章 ===
export const updatePost = async (id: string, updates: Partial<KnowledgeItem>) => {
  const dbUpdates: any = {};
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.content) dbUpdates.content = updates.content;
  if (updates.tags) dbUpdates.tags = updates.tags;
  if (updates.aiClues) dbUpdates.search_clues = updates.aiClues;
  if (updates.attachments) dbUpdates.attachments = updates.attachments;

  const { data: currentPost } = await supabase.from('knowledge_posts').select('status').eq('id', id).single();
  
  if (currentPost?.status === 'rejected') {
      dbUpdates.status = 'pending'; // <--- 关键！被打回后修改，自动重新变成待审核
  }

  
  if (updates.title || updates.content) {
      const textToEmbed = `${updates.title || ''}\n${updates.content || ''}`;
      if (textToEmbed.trim().length > 5) {
         try {
             // 重新获取向量
             const aiData = await _fetchCluesAndEmbedding(textToEmbed);
             if (aiData.embedding) {
                 dbUpdates.embedding = aiData.embedding;
             }
             // 自动更新线索 (如果用户没填)
             if (!updates.aiClues && aiData.clues) {
                 dbUpdates.search_clues = aiData.clues;
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
