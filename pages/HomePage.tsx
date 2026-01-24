import React, { useContext, useState, useEffect } from 'react'; // Added useEffect
import { AppContext } from '../App';
import { Page, PREDEFINED_TAGS, KnowledgeItem } from '../types';
import { FAB, Chip, Card, Avatar, Select } from '../components/M3Components';
import { searchKnowledge } from '../services/knowledgeService'; // Import Service

const HomePage: React.FC<{ onNavigate: (p: Page, id?: string) => void }> = ({ onNavigate }) => {
  const { items, setItems, currentUser } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword');
  const [filterTag, setFilterTag] = useState<string>('All');
  const [isSearching, setIsSearching] = useState(false); // Loading state

  // --- Real Search Logic ---
  useEffect(() => {
    const doSearch = async () => {
      // If empty, we rely on the default 'items' loaded by App.tsx (which are getRecentPosts)
      // But we still need to filter locally if there's a tag selected.
      if (!searchTerm.trim()) {
        getRecentPosts().then(setItems);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchKnowledge(searchTerm, searchMode);
        setItems(results);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search by 500ms
    const timeoutId = setTimeout(doSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchMode, setItems]);

  // --- Local Filtering (for Tags & Status) ---
  // Note: searchKnowledge returns matches, but we still filter by Status/Tag locally for UI consistency
  const filteredItems = items.filter(item => {
    if (item.status === 'rejected') return false;
    // Show pending only to author or admin
    if (item.status === 'pending' && currentUser?.role !== 'admin' && item.author.id !== currentUser?.id) return false;

    // Tag Filter
    if (filterTag !== 'All' && !item.tags.includes(filterTag)) {
      return false;
    }
    
    // If we have a search term, the API returned relevant results.
    // However, if we are in local mode (no search term), we rely on the initial list.
    // The previous logic did local keyword matching. We keep it as fallback for "no search term" filtering?
    // Actually, if searchTerm is empty, we just show the list.
    return true; 
  });

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24">
      
      {/* Search & Filter Area */}
      <div className="py-6 sticky top-16 bg-[#313233] z-30 border-b-2 border-[#1e1e1f]">
        <div className={`
          relative flex items-center w-full h-14 bg-[#1e1e1f] border-2 border-b-[#5b5b5c] border-r-[#5b5b5c] border-t-[#000] border-l-[#000] px-4
          ${searchMode === 'ai' ? 'border-[#b465f5]' : ''}
        `}>
          <span className="material-symbols-rounded text-[#b0b0b0] mr-3">search</span>
          <input 
            className="flex-1 bg-transparent outline-none text-white font-mc text-xl placeholder:text-[#58585a]"
            placeholder={searchMode === 'ai' ? "Describe idea..." : "Search knowledge..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchMode === 'ai' && <span className={`material-symbols-rounded text-[#b465f5] ${isSearching ? 'animate-spin' : 'animate-pulse'}`}>auto_awesome</span>}
        </div>

        {/* Configuration Row: Search Mode & Tag Filters */}
        <div className="mt-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
           {/* Mode Selection */}
           <div className="flex gap-2 items-center">
             <span className="text-xs font-bold text-[#b0b0b0] font-mc uppercase tracking-wide mr-2">Mode</span>
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

           {/* Tag Filters (Dropdown) */}
           <div className="w-full md:w-48">
             <Select 
               label="Filter"
               options={['All', ...PREDEFINED_TAGS]}
               value={filterTag}
               onChange={(val) => setFilterTag(val)}
             />
           </div>
        </div>
      </div>

      {/* Content Stream */}
      <div className="space-y-4 pt-4">
        {filteredItems.length === 0 ? (
           <div className="text-center py-20 opacity-50">
             <span className="material-symbols-rounded text-[48px] text-[#b0b0b0] mb-2 block">content_paste_off</span>
             <p className="font-mc text-xl text-[#b0b0b0]">No knowledge found.</p>
           </div>
        ) : (
          filteredItems.map(item => (
            <Card 
              key={item.id} 
              onClick={() => onNavigate(Page.DETAIL, item.id)}
              className="group relative"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold font-mc text-white tracking-wide">{item.title}</h3>
                {item.status === 'pending' && (
                  <span className="bg-[#FFA500] border-2 border-[#fff] text-[#313233] text-xs px-2 py-0 font-bold uppercase tracking-wider font-mc">
                    Reviewing
                  </span>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                {item.tags.map(tag => (
                  <span key={tag} className="text-xs font-mc text-[#b0b0b0] px-2 py-1 bg-[#1e1e1f] border border-[#5b5b5c]">
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-[#e0e0e0] text-sm line-clamp-3 mb-4 leading-relaxed font-mono">
                {item.content.replace(/[#*`]/g, '')}
              </p>
              
              <div className="flex items-center gap-3 mt-auto pt-3 border-t-2 border-[#1e1e1f]">
                <Avatar name={item.author.name} src={item.author.avatar} size="sm" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold font-mc text-[#b0b0b0]">{item.author.name}</span>
                  <span className="text-[10px] text-[#707070] font-mc">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                {item.aiClues && (
                  <div className="ml-auto text-[10px] text-[#b465f5] flex items-center gap-1 font-mc">
                    <span className="material-symbols-rounded text-[14px]">auto_awesome</span>
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
