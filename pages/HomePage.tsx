import React, { useState, useEffect } from 'react';
import { KnowledgePost } from '../types';
import { searchKnowledge, getRecentPosts } from '../services/knowledgeService';
import { M3Card } from '../components/M3Components';

interface HomePageProps {
  onPostClick: (post: KnowledgePost) => void;
  onFabClick: () => void;
}

export default function HomePage({ onPostClick, onFabClick }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword');
  const [posts, setPosts] = useState<KnowledgePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始加载最近的文章
  useEffect(() => {
    loadRecentPosts();
  }, []);

  const loadRecentPosts = async () => {
    setIsLoading(true);
    try {
      const data = await getRecentPosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      loadRecentPosts();
      return;
    }

    setIsLoading(true);
    try {
      // 调用真实 API
      const results = await searchKnowledge(searchQuery, searchMode);
      setPosts(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Search Area */}
      <div className="flex flex-col gap-4 sticky top-0 pt-2 z-10">
        <form 
          onSubmit={handleSearch}
          className={`
            flex items-center px-4 h-14 rounded-[28px] bg-[#EEF1F4] transition-all duration-300
            ${searchMode === 'ai' ? 'ring-2 ring-[#7CD3EA] shadow-md bg-[#F0F8FF]' : ''}
          `}
        >
          <button type="button" onClick={() => handleSearch()} className="w-10 h-10 flex items-center justify-center text-[#40484C]">
            <span className="material-symbols-rounded">search</span>
          </button>
          
          <input 
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[#191C1E] placeholder-[#70787D] ml-2"
            placeholder={searchMode === 'ai' ? "描述你的需求 (AI 正在辅助)..." : "搜索标题或标签..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchMode === 'ai' && (
             <span className="mr-2 text-[#00668B] text-sm font-medium flex items-center gap-1">
               <span className="material-symbols-rounded text-base">auto_awesome</span>
               AI
             </span>
          )}
        </form>

        {/* Mode Switcher */}
        <div className="flex gap-2 px-2">
           <button 
             onClick={() => setSearchMode('keyword')}
             className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
               searchMode === 'keyword' 
               ? 'bg-[#CDE5FF] border-[#CDE5FF] text-[#001D32]' 
               : 'bg-transparent border-[#70787D] text-[#40484C]'
             }`}
           >
             关键词匹配
           </button>
           <button 
             onClick={() => setSearchMode('ai')}
             className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1 ${
               searchMode === 'ai' 
               ? 'bg-[#D0F8FF] border-[#D0F8FF] text-[#001E2C]' 
               : 'bg-transparent border-[#70787D] text-[#40484C]'
             }`}
           >
             <span className="material-symbols-rounded text-sm">auto_awesome</span>
             AI 智能线索
           </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-4 pb-20">
        {isLoading ? (
          <div className="text-center py-10 text-[#70787D]">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-[#70787D]">暂无相关内容</div>
        ) : (
          posts.map(post => (
            <M3Card 
              key={post.id} 
              className="cursor-pointer hover:bg-[#EEF1F4] transition-colors"
              onClick={() => onPostClick(post)}
            >
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-lg font-medium text-[#191C1E] line-clamp-1">{post.title}</h3>
                 <span className={`text-xs px-2 py-0.5 rounded-full border ${
                   post.type === 'script' ? 'border-green-200 bg-green-50 text-green-700' :
                   post.type === 'block' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                   'border-purple-200 bg-purple-50 text-purple-700'
                 }`}>
                   {post.type}
                 </span>
              </div>
              <p className="text-[#40484C] text-sm line-clamp-2 mb-3">
                {post.content}
              </p>
              <div className="flex items-center justify-between text-xs text-[#70787D]">
                 <div className="flex items-center gap-2">
                    <img src={post.authorAvatar} alt="" className="w-5 h-5 rounded-full bg-gray-200"/>
                    <span>{post.authorName}</span>
                 </div>
                 {/* 如果是 AI 搜出来的，可以显示匹配度，这里暂不显示 */}
              </div>
            </M3Card>
          ))
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={onFabClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#CCE5FF] text-[#001D32] rounded-[20px] shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-105 active:scale-95 transition-all z-20"
      >
        <span className="material-symbols-rounded text-2xl">add</span>
      </button>
    </div>
  );
}
