import React, {
    useState,
    useEffect
} from 'react';
import {
    User,
    KnowledgeItem,
    Page
} from './types';
import {
    Button,
    IconButton,
    Avatar
} from './components/M3Components';
import {
    supabase
} from './services/supabaseClient';
import {
    getRecentPosts,
    getAllUsers
} from './services/knowledgeService';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';

// --- Global Context ---
export const AppContext = React.createContext < {
    currentUser: User | null;
    setCurrentUser: (u: User | null) => void;
    items: KnowledgeItem[];
    setItems: (i: KnowledgeItem[]) => void;
    refreshData: () => Promise < void > ;
    users: User[];
    setUsers: (u: User[]) => void;
    currentPage: Page;
    setCurrentPage: (p: Page) => void;
    selectedItemId: string | null;
    setSelectedItemId: (id: string | null) => void;
} > ({
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
    const [currentUser, setCurrentUser] = useState < User | null > (null);
    const [items, setItems] = useState < KnowledgeItem[] > ([]);
    const [users, setUsers] = useState < User[] > ([]);
    const [currentPage, setCurrentPage] = useState < Page > (Page.LOGIN);
    const [selectedItemId, setSelectedItemId] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        try {
            const posts = await getRecentPosts();
            setItems(posts);
        } catch (e) {
            console.error("Refresh failed", e);
        }
    };

    // Navigation Logic
    const goTo = (page: Page, itemId ? : string) => {
        setSelectedItemId(itemId || null);
        setCurrentPage(page);
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // --- Auth & Data Loading Logic ---
    const fetchUserProfile = async (userId: string) => {
        try {
            const {
                data,
                error
            } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !data) {
                console.warn("Profile not found");
                return;
            }

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

            setCurrentPage(prev => prev === Page.LOGIN ? Page.HOME : prev);

        } catch (e) {
            console.error("Auth Data Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    // Initialize Session
    useEffect(() => {
        supabase.auth.getSession().then(({
            data: {
                session
            }
        }) => {
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setLoading(false);
                setCurrentPage(Page.LOGIN);
            }
        });

        const {
            data: {
                subscription
            },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setCurrentUser(null);
                setCurrentPage(Page.LOGIN);
                setItems([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin
            }
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        goTo(Page.LOGIN);
    };

    const renderPage = () => {
        if (loading) return ( <
            div className = "min-h-screen flex items-center justify-center bg-[#121212] flex-col gap-6" >
            <
            div className = "w-16 h-16 border-4 border-[#7DA3A1] border-t-transparent animate-spin rounded-full opacity-80" > < /div> <
            div className = "text-[#A0A0A0] text-sm tracking-widest uppercase fade-in" > 海内存知己，天涯若比邻... < /div> <
            /div>
        );

        switch (currentPage) {
            case Page.LOGIN:
                return < LoginPage onLogin = {
                    handleLogin
                }
                />;
            case Page.HOME:
                return < HomePage onNavigate = {
                    goTo
                }
                />;
            case Page.CREATE:
                return < EditorPage onNavigate = {
                    goTo
                }
                />;
            case Page.DETAIL:
                return < DetailPage onNavigate = {
                    goTo
                }
                itemId = {
                    selectedItemId
                }
                />;
            case Page.ADMIN:
                return < AdminPage onNavigate = {
                    goTo
                }
                />;
            default:
                return < HomePage onNavigate = {
                    goTo
                }
                />;
        }
    };

    return ( <
        AppContext.Provider value = {
            {
                currentUser,
                setCurrentUser,
                items,
                setItems,
                refreshData,
                users,
                setUsers,
                currentPage,
                setCurrentPage,
                selectedItemId,
                setSelectedItemId
            }
        } >
        <
        div className = "min-h-screen bg-[#121212] text-[#E6E6E6] font-sans selection:bg-[#7DA3A1]/30 selection:text-[#E6E6E6]" > {
            /* Material 3 Top App Bar (Center Aligned or Small) */ } {
            currentPage !== Page.LOGIN && !loading && ( <
                header className = "sticky top-0 left-0 right-0 h-[64px] bg-[#121212]/80 backdrop-blur-md z-40 px-4 flex items-center justify-between transition-all duration-300" >
                <
                div className = "flex items-center gap-4 cursor-pointer group"
                onClick = {
                    () => goTo(Page.HOME)
                } > {
                    /* Animated Menu Icon/Logo */ } <
                div className = "w-10 h-10 rounded-full bg-[#2D3635] flex items-center justify-center group-hover:bg-[#7DA3A1] transition-colors duration-300" >
                <
                img src = "/logo.png"
                alt = "Logo"
                className = "w-6 h-6 object-contain" / >
                <
                /div> <
                span className = "text-xl font-normal tracking-tight text-[#E6E6E6]" > Patchouli < /span> <
                /div>

                {
                    currentUser && ( <
                        div className = "flex items-center gap-3" > {
                            currentUser.role === 'admin' && ( <
                                IconButton icon = "shield_person"
                                onClick = {
                                    () => goTo(Page.ADMIN)
                                }
                                active = {
                                    currentPage === Page.ADMIN
                                }
                                className = "hidden md:flex" /
                                >
                            )
                        }

                        {
                            /* 增加了一个 pb-2 确保鼠标向下移动时始终处于 hover 区域内 */ } <
                        div className = "relative group pb-2" >
                        <
                        Avatar name = {
                            currentUser.name
                        }
                        src = {
                            currentUser.avatar
                        }
                        onClick = {
                            () => {}
                        }
                        />

                        {
                            /* 修改点 1: top-full 确保菜单紧贴父容器底部
                                    修改点 2: pt-2 (padding-top) 创建了一个 8px 的透明感应区，消灭“真空地带”
                                    修改点 3: 内部背景层 div 保持原样，视觉上依然有间距
                                  */
                        } <
                        div className = "absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 origin-top-right animate-[scaleIn_0.2s_ease-out]" >
                        <
                        div className = "bg-[#252529] rounded-2xl p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)] border border-[#333]/50" > {
                            /* 用户信息栏 */ } <
                        div className = "px-4 py-3 border-b border-[#333] mb-2" >
                        <
                        div className = "text-sm font-medium text-[#E6E6E6]" > {
                            currentUser.name
                        } < /div> <
                        div className = "text-xs text-[#A0A0A0]" > {
                            currentUser.role
                        } < /div> <
                        /div>

                        {
                            /* 菜单选项 */ } <
                        button onClick = {
                            () => goTo(Page.HOME)
                        }
                        className = "w-full text-left px-4 py-3 rounded-xl hover:bg-[#383838] text-sm text-[#E6E6E6] flex items-center gap-3 transition-colors" >
                        <
                        span className = "material-symbols-rounded text-lg" > library_books < /span>
                        知识库 <
                        /button>

                        {
                            currentUser.role === 'admin' && ( <
                                button onClick = {
                                    () => goTo(Page.ADMIN)
                                }
                                className = "md:hidden w-full text-left px-4 py-3 rounded-xl hover:bg-[#383838] text-sm text-[#7DA3A1] flex items-center gap-3 mt-1 transition-colors" >
                                <
                                span className = "material-symbols-rounded text-lg" > shield_person < /span>
                                管理面板 <
                                /button>
                            )
                        }

                        <
                        button onClick = {
                            handleLogout
                        }
                        className = "w-full text-left px-4 py-3 rounded-xl hover:bg-[#3F2E2E] text-[#FFB4AB] text-sm flex items-center gap-3 mt-1 transition-colors" >
                        <
                        span className = "material-symbols-rounded text-lg" > logout < /span>
                        注销 <
                        /button> <
                        /div> <
                        /div> <
                        /div> <
                        /div>
                    )
                }

                <
                /header>
            )
        }

        {
            /* Main Content Area */ } <
        main className = {
            `${currentPage !== Page.LOGIN && !loading ? 'pt-4 animate-[slideUp_0.4s_ease-out]' : ''}`
        } > {
            renderPage()
        } <
        /main> <
        /div> <
        /AppContext.Provider>
    );
};

export default App;
