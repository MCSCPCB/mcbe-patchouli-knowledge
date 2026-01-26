import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Page, PREDEFINED_TAGS } from '../types';
import { FAB, Chip, Card, Avatar } from '../components/M3Components';
// 移除了未使用的 Select
import { searchKnowledge } from '../services/knowledgeService';

// 新增：每页显示数量常量
const PAGE_SIZE = 10;

const HomePage: React.FC<{ onNavigate: (p: Page, id?: string) => void }> = ({ onNavigate }) => {
  const { items, setItems, refreshData } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword');
  
  // 修改：将单选状态改为数组，默认包含 "All"
  const [selectedTags, setSelectedTags] = useState<string[]>(['All']);
  const [isSearching, setIsSearching] = useState(false);
  
  // 新增：分页状态
  const [page, setPage] = useState(1);

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

  // 新增：当筛选条件改变时重置分页
  useEffect(() => {
    setPage(1);
    // 可选：切换筛选时滚动到顶部
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchTerm, searchMode, selectedTags]);

  // 新增：标签切换处理函数
  const toggleTag = (tag: string) => {
    if (tag === 'All') {
      setSelectedTags(['All']);
      return;
    }

    setSelectedTags(prev => {
      // 如果当前是“All”状态，点击新标签则清除“All”，只选新标签
      if (prev.includes('All')) {
        return [tag];
      }

      // 如果已经选中，则移除
      if (prev.includes(tag)) {
        const newTags = prev.filter(t => t !== tag);
        // 如果移除后为空，自动回退到“All”
        return newTags.length === 0 ? ['All'] : newTags;
      } else {
        // 否则添加到选中列表
        return [...prev, tag];
      }
    });
  };

  // 修改：根据多标签筛选逻辑
  const filteredItems = items.filter(item => {
    // if (item.status === 'rejected') return false; // 已移除，由后端权限控制
    
    // 如果选中了“All”，则不过滤标签
    if (selectedTags.includes('All')) return true;

    // 检查文章的标签是否包含在选中的标签列表中（只要有一个匹配就显示）
    // 假设 item.tags 是 string[]
    return item.tags.some(tag => selectedTags.includes(tag));
  });

  // 新增：分页计算逻辑
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 翻页处理函数
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32">
      
      {/* Search Header */}
      <div className="sticky top-[64px] bg-[#121212]/90 backdrop-blur-xl z-30 pt-4 pb-2 -mx-4 px-4 border-b border-[#2C2C2C] transition-all">
        <div className={`
          relative flex items-center w-full h-[52px] bg-[#252529] rounded-full transition-all duration-300 group
          ${searchMode === 'ai' ? 'ring-2 ring-[#D0BCFF]/50 bg-[#2B2930]' : 'focus-within:bg-[#303035]'}
        `}>
          <span className="material-symbols-rounded text-[#C7C7CC] ml-4">search</span>
          <input 
            className="flex-1 bg-transparent outline-none text-[#E6E6E6] text-lg placeholder:text-[#8C918C] px-3"
            placeholder={searchMode === 'ai' ? "问问魔導書..." : "寻找芝士..."}
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

        <div className="mt-3 flex items-center gap-2 overflow-x-auto py-1 mask-linear-fade">
           <Chip 
               label="AI" 
               icon="auto_awesome"
               selected={searchMode === 'ai'} 
               onClick={() => setSearchMode(searchMode === 'ai' ? 'keyword' : 'ai')}
           />
           <div className="w-[1px] h-6 bg-[#333] mx-1"></div>
           
           {/* 修改：渲染“All”标签 */}
           <Chip 
             label="All" 
             selected={selectedTags.includes('All')} 
             onClick={() => toggleTag('All')} 
           />
           
           {/* 修改：渲染预定义标签，支持多选状态判定 */}
           {PREDEFINED_TAGS.map(tag => (
               <Chip 
                 key={tag} 
                 label={tag} 
                 selected={selectedTags.includes(tag)} 
                 onClick={() => toggleTag(tag)} 
               />
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
             <p className="text-[#8C918C]">知识库里空空如也，来点“芝士”吧！</p>
           </div>
        ) : (
          <>
            {paginatedItems.map(item => (
              <Card 
                key={item.id} 
                onClick={() => onNavigate(Page.DETAIL, item.id)}
                className="group"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-normal text-[#E6E6E6] group-hover:text-[#7DA3A1] transition-colors line-clamp-1">{item.title}</h3>
                  
                  {/* 状态标签：Pending 和 Rejected */}
                  <div className="flex gap-2">
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
                </div>

                {/* 修改点：线索摘要改为2行限制，且优化图标排版 */}
                <p className={`text-sm line-clamp-2 mb-4 leading-relaxed font-sans ${item.aiClues ? 'text-[#D0BCFF] italic' : 'text-[#C7C7CC]'}`}>
                  {item.aiClues ? (
                     <>
                       {/* 将图标改为 inline-block 以完美适配文字流 */}
                       <span className="material-symbols-rounded text-[14px] mr-1 translate-y-[2px] inline-block select-none">auto_awesome</span>
                       {item.aiClues}
                     </>
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
            ))}

            {/* 新增：分页控件 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                 <button 
                   onClick={() => handlePageChange(Math.max(1, page - 1))}
                   disabled={page === 1}
                   className={`
                     px-4 py-2 rounded-full text-sm font-medium transition-colors 
                     ${page === 1 ? 'text-[#444] cursor-not-allowed' : 'bg-[#252529] text-[#E6E6E6] hover:bg-[#333]'}
                   `}
                 >
                   上一页
                 </button>
                 <span className="text-[#8C918C] text-sm font-mono">
                   {page} / {totalPages}
                 </span>
                 <button 
                   onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                   disabled={page === totalPages}
                   className={`
                     px-4 py-2 rounded-full text-sm font-medium transition-colors 
                     ${page === totalPages ? 'text-[#444] cursor-not-allowed' : 'bg-[#252529] text-[#E6E6E6] hover:bg-[#333]'}
                   `}
                 >
                   下一页
                 </button>
              </div>
            )}
          </>
        )}
      </div>

      <FAB 
        icon="edit" 
        onClick={() => onNavigate(Page.CREATE)} 
        label="撰写知识"
        extended={true}
      />
    </div>
  );
};

export default HomePage;
