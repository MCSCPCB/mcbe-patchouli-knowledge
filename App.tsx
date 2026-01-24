import React, { useState, useEffect } from 'react';
import { User, KnowledgeItem, Page } from './types';
import { Button, IconButton, Avatar } from './components/M3Components';
import { supabase } from './services/supabaseClient';
import { getRecentPosts, getAllUsers } from './services/knowledgeService';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';

// --- Global Context ---
export const AppContext = React.createContext<{
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  items: KnowledgeItem[];
  setItems: (i: KnowledgeItem[]) => void;
  refreshData: () => Promise<void>;
  users: User[];
  setUsers: (u: User[]) => void;
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
}>({
  currentUser: null,
  setCurrentUser: () => {},
  items: [],
  setItems: () => {},
  refreshData: async () => {},
  users: [],
  setUsers: () => {},
  currentPage: Page.LOGIN,
  setCurrentPage: () => {},
  selectedItemId: null,
  setSelectedItemId: () => {},
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>(Page.LOGIN);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const posts = await getRecentPosts();
      setItems(posts); // 核心：这里更新了，所有订阅 Context 的组件都会重绘
    } catch (e) {
      console.error("Refresh failed", e);
    }
  };

  // Navigation Logic
  const goTo = (page: Page, itemId?: string) => {
    if (itemId) setSelectedItemId(itemId);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // --- Auth & Data Loading Logic ---

  // 1. Fetch User Profile from DB (Role, Ban status)
  const fetchUserProfile = async (userId: string) => {
    try {
      // Query the 'profiles' table to get role and ban status
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.warn("Profile not found, waiting for trigger...");
        return; // Trigger might be slow on first signup
      }

      const user: User = {
        id: data.id,
        name: data.github_id || 'Unknown',
        avatar: data.avatar_url || '',
        role: data.role,
        banned: data.is_banned
      };

      setCurrentUser(user);
      await refreshData();

      // 2. Load Knowledge Content
      const posts = await getRecentPosts();
      setItems(posts);

      // 3. If Admin, load User List for Admin Panel
      if (data.role === 'admin') {
         const allUsers = await getAllUsers();
         setUsers(allUsers);
      }

      // Redirect logic: If on Login page, go Home
      setCurrentPage(prev => prev === Page.LOGIN ? Page.HOME : prev);
      
    } catch (e) {
      console.error("Auth Data Load Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Session
  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
        setCurrentPage(Page.LOGIN);
      }
    });

    // Listen for auth state changes (Login, Logout, Auto-refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Only fetch if we don't have user loaded yet to avoid loops, 
        // or just rely on fetchUserProfile to update state safely
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setCurrentPage(Page.LOGIN);
        setItems([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Handlers ---

  const handleLogin = async () => {
    // Real Supabase GitHub Login
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin // Redirect back to this page
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    goTo(Page.LOGIN);
  };

  const renderPage = () => {
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#313233] flex-col gap-4">
             <div className="w-12 h-12 border-4 border-[#3C8527] border-t-transparent animate-spin rounded-full"></div>
             <div className="text-[#b0b0b0] font-mc text-xl">Loading World...</div>
        </div>
    );

    switch (currentPage) {
      case Page.LOGIN:
        return <LoginPage onLogin={handleLogin} />;
      case Page.HOME:
        return <HomePage onNavigate={goTo} />;
      case Page.CREATE:
        return <EditorPage onNavigate={goTo} />;
      case Page.DETAIL:
        return <DetailPage onNavigate={goTo} itemId={selectedItemId} />;
      case Page.ADMIN:
        return <AdminPage onNavigate={goTo} />;
      default:
        return <HomePage onNavigate={goTo} />;
    }
  };

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, items, setItems, refreshData, users, setUsers, currentPage, setCurrentPage, selectedItemId, setSelectedItemId }}>
      <div className="min-h-screen bg-[#313233] text-[#E0E0E0] font-sans selection:bg-[#3C8527] selection:text-white">
        {/* Header (Top App Bar) */}
        {currentPage !== Page.LOGIN && !loading && (
          <header className="fixed top-0 left-0 right-0 h-16 bg-[#313233] z-40 px-4 flex items-center justify-between border-b-4 border-[#1e1e1f] shadow-lg">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => goTo(Page.HOME)}>
               <div className="w-10 h-10 bg-[#3C8527] border-2 border-white flex items-center justify-center">
                   <span className="material-symbols-rounded text-white">menu_book</span>
               </div>
               <span className="font-mc text-2xl tracking-wide text-white drop-shadow-md">Patchouli</span>
             </div>
             
             {currentUser && (
               <div className="flex items-center gap-2">
                 {currentUser.role === 'admin' && (
                    <IconButton 
                      icon="admin_panel_settings" 
                      onClick={() => goTo(Page.ADMIN)} 
                      active={currentPage === Page.ADMIN}
                      title="Admin Panel"
                    />
                 )}
                 <div className="relative group">
                   <Avatar name={currentUser.name} src={currentUser.avatar} onClick={() => {}} />
                   {/* Dropdown Menu */}
                   <div className="absolute right-0 top-14 w-48 bg-[#313233] border-2 border-white p-1 hidden group-hover:block z-50 shadow-[4px_4px_0_0_#000]">
                     <div className="px-4 py-2 text-xs text-[#b0b0b0] font-mc uppercase">Account</div>
                     <button onClick={() => goTo(Page.HOME)} className="w-full text-left px-4 py-3 hover:bg-[#48494a] text-sm mb-1 font-mc text-white">My Knowledge</button>
                     <button onClick={handleLogout} className="w-full text-left px-4 py-3 hover:bg-[#8B0000] hover:text-white text-[#ff5555] text-sm font-mc">Logout</button>
                   </div>
                 </div>
               </div>
             )}
          </header>
        )}
        
        {/* Main Content Area */}
        <main className={`${currentPage !== Page.LOGIN && !loading ? 'pt-20' : ''}`}>
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;
