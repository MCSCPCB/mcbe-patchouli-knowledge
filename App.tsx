import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'; // 引入路由
import { User, KnowledgeItem } from './types';
import { IconButton, Avatar } from './components/M3Components';
import { supabase } from './services/supabaseClient';
import { getRecentPosts, getAllUsers } from './services/knowledgeService';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';

// --- Global Context ---
// 修改点：Context 中移除了 currentPage 和 selectedItemId
export const AppContext = React.createContext<{
    currentUser: User | null;
    setCurrentUser: (u: User | null) => void;
    items: KnowledgeItem[];
    setItems: (i: KnowledgeItem[]) => void;
    refreshData: () => Promise<void>;
    users: User[];
    setUsers: (u: User[]) => void;
}>({
    currentUser: null,
    setCurrentUser: () => {},
    items: [],
    setItems: () => {},
    refreshData: async () => {},
    users: [],
    setUsers: () => {},
});

// === 内部组件：包含原本 App 的主要逻辑 ===
const AppContent: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    const navigate = useNavigate(); // 使用 Hook 进行跳转
    const location = useLocation(); // 获取当前路径

    const refreshData = async () => {
        try {
            const posts = await getRecentPosts();
            setItems(posts);
        } catch (e) {
            console.error("Refresh failed", e);
        }
    };

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (error || !data) return;

            const user: User = {
                id: data.id,
                name: data.github_id || 'Traveler',
                avatar: data.avatar_url || '',
                role: data.role,
                banned: data.is_banned
            };

            setCurrentUser(user);
            await refreshData();

            if (data.role === 'admin') {
                const allUsers = await getAllUsers();
                setUsers(allUsers);
            }
            
            // 登录成功后，如果是登录页则跳转首页，否则停留在原 URL
            if (location.pathname === '/login') {
                navigate('/');
            }

        } catch (e) {
            console.error("Auth Data Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setLoading(false);
                navigate('/login');
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setCurrentUser(null);
                setItems([]);
                navigate('/login');
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin }
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        navigate('/login');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212] flex-col gap-6">
            <div className="w-16 h-16 border-4 border-[#7DA3A1] border-t-transparent animate-spin rounded-full opacity-80"></div>
            <div className="text-[#A0A0A0] text-sm tracking-widest uppercase fade-in">海内存知己，天涯若比邻...</div>
        </div>
    );

    // 判断是否显示 Header (非登录页)
    const showHeader = location.pathname !== '/login';

    return (
        <AppContext.Provider value={{ currentUser, setCurrentUser, items, setItems, refreshData, users, setUsers }}>
            <div className="min-h-screen bg-[#121212] text-[#E6E6E6] font-sans selection:bg-[#7DA3A1]/30 selection:text-[#E6E6E6]">
                {showHeader && (
                    <header className="sticky top-0 left-0 right-0 h-[64px] bg-[#121212]/80 backdrop-blur-md z-40 px-4 flex items-center justify-between transition-all duration-300">
                        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 rounded-full bg-[#2D3635] flex items-center justify-center group-hover:bg-[#7DA3A1] transition-colors duration-300">
                                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                            </div>
                            <span className="text-xl font-normal tracking-tight text-[#E6E6E6]">Patchouli</span>
                        </div>

                        {currentUser && (
                            <div className="flex items-center gap-3">
                                {currentUser.role === 'admin' && (
                                    <IconButton icon="shield_person" onClick={() => navigate('/admin')} active={location.pathname === '/admin'} className="hidden md:flex" />
                                )}
                                <div className="relative group pb-2">
                                    <Avatar name={currentUser.name} src={currentUser.avatar} onClick={() => {}} />
                                    <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 origin-top-right animate-[scaleIn_0.2s_ease-out]">
                                        <div className="bg-[#252529] rounded-2xl p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)] border border-[#333]/50">
                                            <div className="px-4 py-3 border-b border-[#333] mb-2">
                                                <div className="text-sm font-medium text-[#E6E6E6]">{currentUser.name}</div>
                                                <div className="text-xs text-[#A0A0A0]">{currentUser.role}</div>
                                            </div>
                                            <button onClick={() => navigate('/')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#383838] text-sm text-[#E6E6E6] flex items-center gap-3 transition-colors">
                                                <span className="material-symbols-rounded text-lg">library_books</span>
                                                知识库
                                            </button>
                                            {currentUser.role === 'admin' && (
                                                <button onClick={() => navigate('/admin')} className="md:hidden w-full text-left px-4 py-3 rounded-xl hover:bg-[#383838] text-sm text-[#7DA3A1] flex items-center gap-3 mt-1 transition-colors">
                                                    <span className="material-symbols-rounded text-lg">shield_person</span>
                                                    管理面板
                                                </button>
                                            )}
                                            <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#3F2E2E] text-[#FFB4AB] text-sm flex items-center gap-3 mt-1 transition-colors">
                                                <span className="material-symbols-rounded text-lg">logout</span>
                                                注销
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </header>
                )}

                <main className={showHeader ? 'pt-4 animate-[slideUp_0.4s_ease-out]' : ''}>
                    <Routes>
                        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                        <Route path="/" element={<HomePage />} />
                        <Route path="/create" element={<EditorPage />} />
                        <Route path="/edit/:id" element={<EditorPage />} />
                        <Route path="/detail/:id" element={<DetailPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        {/* 默认路由 */}
                        <Route path="*" element={<HomePage />} />
                    </Routes>
                </main>
            </div>
        </AppContext.Provider>
    );
};

// === 根组件：包裹 Router ===
const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
};

export default App;
