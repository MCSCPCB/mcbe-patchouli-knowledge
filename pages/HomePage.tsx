import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Page, PREDEFINED_TAGS } from '../types';
import { FAB, Chip, Card, Avatar, Select } from '../components/M3Components';
import { searchKnowledge } from '../services/knowledgeService';

const HomePage: React.FC<{ onNavigate: (p: Page, id?: string) => void }> = ({ onNavigate }) => {
  const { items, setItems, refreshData } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword');
  const [filterTag, setFilterTag] = useState<string>('All');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const doSearch = async () => {
      if (!searchTerm.trim()) {
        setIsSearching(true);
        await refreshData(); 
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchKnowledge(searchTerm, searchMode);
        setItems(results);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(doSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchMode, setItems]);

  const filteredItems = items.filter(item => {
    if (filterTag !== 'All' && !item.tags.includes(filterTag)) return false;
    return true; 
  });

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32">
      
      {/* Search Header - Sticky with Blur */}
      <div className="sticky top-[64px] bg-[#121212]/90 backdrop-blur-xl z-30 pt-4 pb-2 -mx-4 px-4 border-b border-[#2C2C2C] transition-all">
        {/* M3 Search Bar */}
        <div className={`
          relative flex items-center w-full h-[52px] bg-[#252529] rounded-full transition-all duration-300 group
          ${searchMode === 'ai' ? 'ring-2 ring-[#D0BCFF]/50 bg-[#2B2930]' : 'focus-within:bg-[#303035]'}
        `}>
          <span className="material-symbols-rounded text-[#C7C7CC] ml-4">search</span>
          <input 
            className="flex-1 bg-transparent outline-none text-[#E6E6E6] text-lg placeholder:text-[#8C918C] px-3"
            placeholder={searchMode === 'ai' ? "Ask the Grimoire..." : "Search knowledge..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchMode === 'ai' && (
            <span className={`material-symbols-rounded text-[#D0BCFF] mr-4 ${isSearching ? 'animate-spin' : 'animate-pulse'}`}>auto_awesome</span>
          )}
          {searchTerm && (
             <button onClick={() => setSearchTerm('')} className="mr-3 w-8 h-8 rounded-full hover:bg-[#444] flex items-center justify-center text-[#C7C7CC]">
                 <span className="material-symbols-rounded text-lg">close</span>
             </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mask-linear-fade">
           <Chip 
               label="AI" 
               icon="auto_awesome"
               selected={searchMode === 'ai'} 
               onClick={() => setSearchMode(searchMode === 'ai' ? 'keyword' : 'ai')}
           />
           <div className="w-[1px] h-6 bg-[#333] mx-1"></div>
           <Chip label="All" selected={filterTag === 'All'} onClick={() => setFilterTag('All')} />
           {PREDEFINED_TAGS.map(tag => (
               <Chip key={tag} label={tag} selected={filterTag === tag} onClick={() => setFilterTag(tag)} />
           ))}
        </div>
      </div>

      {/* Content Stream */}
      <div className="space-y-4 pt-6">
        {filteredItems.length === 0 ? (
           <div className="text-center py-20 flex flex-col items-center">
             <div className="w-24 h-24 bg-[#1E1E1E] rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-rounded text-[40px] text-[#444]">content_paste_off</span>
             </div>
             <p className="text-[#8C918C]">No knowledge found in the archives.</p>
           </div>
        ) : (
          filteredItems.map(item => (
            <Card 
              key={item.id} 
              onClick={() => onNavigate(Page.DETAIL, item.id)}
              className="group"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-normal text-[#E6E6E6] group-hover:text-[#7DA3A1] transition-colors line-clamp-1">{item.title}</h3>
                {item.status === 'pending' && (
                  <span className="bg-[#FFD8E4] text-[#31111D] text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                    Review
                  </span>
                )}
                {item.status === 'rejected' && (
                  <span className="bg-[#CF6679] text-[#37000B] text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                    Needs Revision
                  </span>
                )}

              </div>

              {/* 修改点 1: 优先显示 AI Clues，如果没有则显示原文摘要 */}
              <p className={`text-sm line-clamp-3 mb-4 leading-relaxed font-sans ${item.aiClues ? 'text-[#D0BCFF] italic' : 'text-[#C7C7CC]'}`}>
                {item.aiClues ? (
                   <span className="flex gap-1">
                     <span className="material-symbols-rounded text-[14px] mt-0.5">auto_awesome</span>
                     {item.aiClues}
                   </span>
                ) : (
                   item.content.replace(/[#*`]/g, '')
                )}
              </p>
              
              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[#333]">
                <Avatar name={item.author.name} src={item.author.avatar} size="sm" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[#E6E6E6]">{item.author.name}</span>
                  <span className="text-[10px] text-[#8C918C]">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                {item.aiClues && (
                  <div className="ml-auto px-3 py-1 bg-[#D0BCFF]/10 rounded-full text-[10px] text-[#D0BCFF] flex items-center gap-1 border border-[#D0BCFF]/20">
                    <span className="material-symbols-rounded text-[12px]">auto_awesome</span>
                    Enhanced
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <FAB 
        icon="edit" 
        onClick={() => onNavigate(Page.CREATE)} 
        label="Compose"
        extended={true}
      />
    </div>
  );
};

export default HomePage;
