import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Page, ItemType, Item, KnowledgePost } from '../types';
import { IconButton } from '../components/M3Components';
import { searchKnowledge } from '../services/knowledgeService';

const HomePage: React.FC<{ onNavigate: (p: Page, id?: string) => void }> = ({ onNavigate }) => {
  const { items, setItems, currentUser } = useContext(AppContext);
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 执行搜索 (AI + 关键词)
  const handleSearch = async () => {
    if (!searchText.trim()) {
      // 如果搜索为空，通常应该重置为“最近文章”，这里我们在App.tsx已经加载了最近文章
      // 可以在这里触发一次重新加载，或者简单不做处理
      return;
    }

    setIsSearching(true);
    try {
      // 默认开启 AI 模式 ('ai')
      const results = await searchKnowledge(searchText, 'ai');
      
      // 转换数据格式
      const formattedResults: Item[] = results.map((p: KnowledgePost) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        type: p.type,
        attachments: p.attachments,
        aiClues: p.searchClues,
        status: p.status,
        createdAt: p.createdAt,
        author: {
          id: p.authorId,
          name: p.authorName,
          avatar: p.authorAvatar,
          role: 'user'
        }
      }));
      setItems(formattedResults);
    } catch (error) {
      console.error(error);
      alert('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // 本地过滤 (类型筛选)
  const filteredItems = items.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
         <div className="relative flex-1 group">
            <input 
              type="text" 
              placeholder="Search knowledge... (AI Powered)" 
              className="w-full bg-[#1e1e1f] border-2 border-[#5b5b5c] text-white px-4 py-3 font-mono outline-none focus:border-[#3C8527] focus:bg-[#000] transition-colors placeholder-[#5b5b5c]"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              onClick={handleSearch}
              className="absolute right-2 top-2 p-1 text-[#b0b0b0] hover:text-white"
            >
              {isSearching ? (
                 <span className="material-symbols-rounded animate-spin">sync</span>
              ) : (
                 <span className="material-symbols-rounded">search</span>
              )}
            </button>
         </div>

         <div className="flex bg-[#1e1e1f] border-2 border-[#5b5b5c] p-1 gap-1">
            {(['all', 'script', 'block', 'entity'] as const).map(type => (
               <button
                 key={type}
                 onClick={() => setFilterType(type)}
                 className={`px-4 py-2 font-mc text-xs uppercase transition-all ${
                   filterType === type 
                   ? 'bg-[#3C8527] text-white border border-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' 
                   : 'text-[#b0b0b0] hover:bg-[#2b2b2b]'
                 }`}
               >
                 {type}
               </button>
            ))}
         </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredItems.map(item => (
            <div 
              key={item.id}
              onClick={() => onNavigate(Page.DETAIL, item.id)}
              className="group bg-[#2b2b2b] border-4 border-[#151515] p-0 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden flex flex-col h-[280px]"
            >
               {/* Decorative border lines */}
               <div className="absolute top-0 left-0 w-full h-1 bg-[#5b5b5c] opacity-20"></div>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-[#000] opacity-20"></div>

               {/* Header */}
               <div className="p-4 border-b-2 border-[#1e1e1f] bg-[#232323] flex justify-between items-start">
                  <div className={`px-2 py-1 text-[10px] font-bold font-mc uppercase border border-[#000] text-black ${
                     item.type === 'script' ? 'bg-[#98FB98]' : 
                     item.type === 'block' ? 'bg-[#87CEEB]' : 'bg-[#DDA0DD]'
                  }`}>
                    {item.type}
                  </div>
                  {item.status === 'pending' && (
                     <span className="text-[10px] font-mc text-yellow-500 animate-pulse">PENDING</span>
                  )}
               </div>

               {/* Body */}
               <div className="p-5 flex-1 overflow-hidden relative">
                  <h3 className="text-xl font-bold text-white font-mc mb-3 leading-snug group-hover:text-[#3C8527] transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-[#b0b0b0] font-mono text-sm line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                  {/* Fade out effect */}
                  <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#2b2b2b] to-transparent"></div>
               </div>

               {/* Footer */}
               <div className="p-3 bg-[#1e1e1f] border-t-2 border-[#151515] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 border border-[#5b5b5c]">
                        <img src={item.author.avatar} className="w-full h-full object-cover" alt=""/>
                     </div>
                     <span className="text-xs text-[#b0b0b0] font-mono">{item.author.name}</span>
                  </div>
                  {/* AI Match Indicator (Mock visual for now) */}
                  {searchText && (
                    <span className="text-[10px] text-[#3C8527] font-mc flex items-center gap-1">
                       <span className="material-symbols-rounded text-xs">auto_awesome</span>
                       MATCH
                    </span>
                  )}
               </div>
            </div>
         ))}
      </div>

      {/* FAB */}
      {currentUser && (
        <button 
          onClick={() => onNavigate(Page.EDITOR)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#3C8527] border-4 border-white shadow-[4px_4px_0_0_#000] flex items-center justify-center hover:bg-[#4CAF50] hover:scale-105 active:scale-95 transition-all z-40 group"
        >
          <span className="material-symbols-rounded text-white text-3xl font-bold group-hover:rotate-90 transition-transform">add</span>
        </button>
      )}
    </div>
  );
};

export default HomePage;
