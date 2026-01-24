import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { FAB, Chip, Card, Avatar } from '../components/M3Components';

const HomePage: React.FC<{ onNavigate: (p: Page, id?: string) => void }> = ({ onNavigate }) => {
  const { items, currentUser } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (item.status === 'rejected') return false;
      // Show pending only to author or admin
      if (item.status === 'pending' && currentUser?.role !== 'admin' && item.author.id !== currentUser?.id) return false;

      const lowerTerm = searchTerm.toLowerCase();
      
      if (searchMode === 'keyword') {
        return item.title.toLowerCase().includes(lowerTerm) || 
               item.content.toLowerCase().includes(lowerTerm) ||
               item.tags.some(t => t.toLowerCase().includes(lowerTerm));
      } else {
        // AI Clue search: Look specifically in the aiClues field
        return item.aiClues?.toLowerCase().includes(lowerTerm) || 
               item.title.toLowerCase().includes(lowerTerm);
      }
    });
  }, [items, searchTerm, searchMode, currentUser]);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24">
      
      {/* Search Area */}
      <div className="py-8 sticky top-16 bg-[#FDFDFD] z-30 transition-all">
        <div className={`
          relative flex items-center w-full h-14 rounded-[28px] bg-[#F0F4F8] px-4 transition-all duration-300
          ${searchMode === 'ai' ? 'ring-2 ring-indigo-300 bg-indigo-50/50' : 'ring-0'}
        `}>
          <span className="material-symbols-rounded text-slate-500 mr-3">search</span>
          <input 
            className="flex-1 bg-transparent outline-none text-slate-900 text-lg placeholder:text-slate-400"
            placeholder={searchMode === 'ai' ? "Describe what you're looking for..." : "Search knowledge..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchMode === 'ai' && <span className="material-symbols-rounded text-indigo-500 animate-pulse">auto_awesome</span>}
        </div>

        {/* Search Mode Toggle */}
        <div className="flex gap-2 mt-4 justify-center">
           <Chip 
             label="Keywords" 
             selected={searchMode === 'keyword'} 
             onClick={() => setSearchMode('keyword')}
           />
           <Chip 
             label="AI Clues" 
             icon="auto_awesome"
             selected={searchMode === 'ai'} 
             onClick={() => setSearchMode('ai')}
           />
        </div>
      </div>

      {/* Content Stream */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
           <div className="text-center py-20 opacity-50">
             <span className="material-symbols-rounded text-[48px] mb-2 block">content_paste_off</span>
             <p>No knowledge found.</p>
           </div>
        ) : (
          filteredItems.map(item => (
            <Card 
              key={item.id} 
              variant="elevated" 
              onClick={() => onNavigate(Page.DETAIL, item.id)}
              className="group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                {item.status === 'pending' && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                    Reviewing
                  </span>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                {item.tags.map(tag => (
                  <span key={tag} className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-slate-600 text-sm line-clamp-3 mb-4 leading-relaxed">
                {item.content.replace(/[#*`]/g, '')}
              </p>
              
              <div className="flex items-center gap-3 mt-auto pt-3 border-t border-slate-100">
                <Avatar name={item.author.name} src={item.author.avatar} size="sm" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">{item.author.name}</span>
                  <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                {item.aiClues && (
                  <div className="ml-auto text-[10px] text-indigo-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        icon="add" 
        onClick={() => onNavigate(Page.CREATE)} 
        label="New"
      />
    </div>
  );
};

export default HomePage;
