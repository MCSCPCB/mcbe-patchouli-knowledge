import React, { useState, useEffect, createContext } from 'react';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import DetailPage from './pages/DetailPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import { Page, User, Item, KnowledgePost } from './types';
import { supabase } from './services/supabaseClient';
import { getRecentPosts } from './services/knowledgeService';

// App Context State Definition
interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  items: Item[];
  setItems: (items: Item[]) => void;
  navigateTo: (page: Page, itemId?: string) => void;
}

export const AppContext = createContext<AppState>({
  currentUser: null,
  setCurrentUser: () => {},
  items: [],
  setItems: () => {},
  navigateTo: () => {},
});

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. 初始化：监听 Supabase 登录状态并获取数据
  useEffect(() => {
    // 检查 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // 监听变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    // 加载初始数据
    loadKnowledgeData();

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: any) => {
    if (session?.user) {
      // 获取用户扩展信息 (角色等)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setCurrentUser({
          id: session.user.id,
          name: profile.github_id || 'User',
          avatar: profile.avatar_url || '',
          role: profile.role,
          isBanned: profile.is_banned
        });
      }
    } else {
      setCurrentUser(null);
    }
    setIsLoading(false);
  };

  // 2. 从后端加载数据并转换格式
  const loadKnowledgeData = async () => {
    try {
      const posts = await getRecentPosts();
      // 数据转换: KnowledgePost (Flat) -> Item (Nested)
      const formattedItems: Item[] = posts.map((p: KnowledgePost) => ({
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
          role: 'user' // 列表页暂时不需要具体role，默认为user即可
        }
      }));
      setItems(formattedItems);
    } catch (error) {
      console.error('Failed to load posts', error);
    }
  };

  const navigateTo = (page: Page, itemId?: string) => {
    setCurrentPage(page);
    if (itemId) setSelectedItemId(itemId);
    // 每次回到首页时刷新数据
    if (page === Page.HOME) {
      loadKnowledgeData();
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#1e1e1f] flex items-center justify-center text-white font-mc">Loading...</div>;
  }

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, items, setItems, navigateTo }}>
      <div className="min-h-screen bg-[#1e1e1f] font-sans selection:bg-[#3C8527] selection:text-white">
        {/* Navigation Bar */}
        <nav className="border-b-4 border-[#151515] bg-[#2b2b2b] p-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => navigateTo(Page.HOME)}
            >
              <div className="w-10 h-10 bg-[#3C8527] border-2 border-[#fff] shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.5)] group-hover:bg-[#4CAF50] transition-colors flex items-center justify-center">
                 <span className="material-symbols-rounded text-white">book_2</span>
              </div>
              <span className="text-xl font-bold text-white tracking-wider font-mc drop-shadow-md">PATCHOULI</span>
            </div>

            <div className="flex items-center gap-4">
              {currentUser ? (
                <>
                  <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-white font-bold font-mc text-sm">{currentUser.name}</span>
                    <span className="text-[#b0b0b0] text-xs font-mono">LV.{currentUser.role === 'admin' ? 'OP' : '1'}</span>
                  </div>
                  <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 border-2 border-white bg-[#1e1e1f]" />
                  {currentUser.role === 'admin' && (
                     <button onClick={() => navigateTo(Page.ADMIN)} className="p-2 text-[#b0b0b0] hover:text-white">
                        <span className="material-symbols-rounded">admin_panel_settings</span>
                     </button>
                  )}
                  <button onClick={() => supabase.auth.signOut()} className="p-2 text-[#b0b0b0] hover:text-white" title="Logout">
                    <span className="material-symbols-rounded">logout</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => navigateTo(Page.LOGIN)}
                  className="px-4 py-2 bg-[#1e1e1f] border-2 border-[#5b5b5c] text-white font-mc text-sm hover:bg-[#3C8527] hover:border-white transition-all"
                >
                  LOGIN
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-4 md:p-6">
          {currentPage === Page.LOGIN && <LoginPage onLoginSuccess={() => navigateTo(Page.HOME)} />}
          {currentPage === Page.HOME && <HomePage onNavigate={navigateTo} />}
          {currentPage === Page.EDITOR && <EditorPage onNavigate={navigateTo} />}
          {currentPage === Page.DETAIL && <DetailPage onNavigate={navigateTo} itemId={selectedItemId} />}
          {currentPage === Page.ADMIN && <AdminPage onNavigate={navigateTo} />}
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;
