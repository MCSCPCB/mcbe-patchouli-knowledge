import React, { useState, useEffect } from 'react';
import { M3Theme, M3NavigationRail, M3IconButton, M3Avatar } from './components/M3Components';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import EditorPage from './pages/EditorPage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';
import { User, KnowledgePost } from './types';
import { supabase } from './services/supabaseClient'; // 确保你已经创建了这个文件

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<'home' | 'login' | 'editor' | 'detail' | 'admin'>('home');
  const [selectedPost, setSelectedPost] = useState<KnowledgePost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：监听 Supabase 登录状态
  useEffect(() => {
    // 1. 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // 2. 监听登录/登出变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 处理会话数据，映射为我们的 User 类型
  const handleSession = async (session: any) => {
    if (!session?.user) {
      setCurrentUser(null);
      // 如果不在登录页，踢回首页或保留现状（根据需求，这里允许未登录访问首页）
    } else {
      // 查询 profiles 表获取角色信息
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setCurrentUser({
          id: session.user.id,
          name: profile.github_id || session.user.user_metadata.user_name,
          avatar: profile.avatar_url || session.user.user_metadata.avatar_url,
          role: profile.role,
          isBanned: profile.is_banned
        });
      }
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentRoute('login');
  };

  const navigateTo = (page: 'home' | 'login' | 'editor' | 'detail' | 'admin', post?: KnowledgePost) => {
    setCurrentRoute(page);
    if (post) setSelectedPost(post);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#FDFDFD]">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#FDFDFD] text-[#191C1E] font-sans overflow-hidden">
      {/* Navigation Rail (Desktop) or Drawer Trigger (Mobile) */}
      {currentUser && (
        <M3NavigationRail 
          className="hidden md:flex z-20"
          actions={[
            { icon: 'home', label: '首页', active: currentRoute === 'home', onClick: () => navigateTo('home') },
            // 只有管理员能看到 admin 入口
            ...(currentUser.role === 'admin' ? [{ icon: 'admin_panel_settings', label: '管理', active: currentRoute === 'admin', onClick: () => navigateTo('admin') }] : []),
            { icon: 'add_circle', label: '投稿', active: currentRoute === 'editor', onClick: () => navigateTo('editor') },
            { icon: 'logout', label: '登出', onClick: handleLogout }
          ]}
        >
          <div className="mb-4">
             <M3Avatar src={currentUser.avatar} alt={currentUser.name} size="md" />
          </div>
        </M3NavigationRail>
      )}

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
        
        {/* Top Bar for Mobile / General */}
        <header className="sticky top-0 z-10 bg-[#FDFDFD]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#E1E2E4]">
           <div className="flex items-center gap-3" onClick={() => navigateTo('home')}>
              <div className="w-8 h-8 rounded-full bg-[#DCE3E9] flex items-center justify-center">
                 <span className="material-symbols-rounded text-[#40484C]">api</span>
              </div>
              <h1 className="text-xl font-medium text-[#191C1E]">Ark Knowledge</h1>
           </div>
           
           {!currentUser && currentRoute !== 'login' && (
             <button 
               onClick={() => navigateTo('login')}
               className="px-4 py-2 bg-[#00668B] text-white rounded-full text-sm font-medium hover:shadow-md transition-all"
             >
               登录
             </button>
           )}
        </header>

        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24">
          {currentRoute === 'login' && (
            <LoginPage onLoginSuccess={() => navigateTo('home')} />
          )}

          {currentRoute === 'home' && (
            <HomePage 
              onPostClick={(post) => navigateTo('detail', post)} 
              onFabClick={() => currentUser ? navigateTo('editor') : navigateTo('login')}
            />
          )}

          {currentRoute === 'editor' && currentUser && (
             <EditorPage 
               currentUser={currentUser} 
               onCancel={() => navigateTo('home')} 
               onSuccess={() => navigateTo('home')}
             />
          )}

          {currentRoute === 'detail' && selectedPost && (
            <DetailPage 
              post={selectedPost} 
              currentUser={currentUser}
              onBack={() => navigateTo('home')}
            />
          )}

          {currentRoute === 'admin' && currentUser?.role === 'admin' && (
             <AdminPage currentUser={currentUser} />
          )}
        </div>
      </main>
    </div>
  );
}
