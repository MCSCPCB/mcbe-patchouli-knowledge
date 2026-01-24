import React, { useState, useEffect } from 'react';
import { User, KnowledgeItem, Page, Variant } from './types';
import { Button, IconButton, Avatar, Dialog } from './components/M3Components';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';

// --- Global Context for simplicity in this demo ---
export const AppContext = React.createContext<{
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  items: KnowledgeItem[];
  setItems: (i: KnowledgeItem[]) => void;
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
  users: [],
  setUsers: () => {},
  currentPage: Page.LOGIN,
  setCurrentPage: () => {},
  selectedItemId: null,
  setSelectedItemId: () => {},
});

// --- Mock Data Initialization ---
const MOCK_USERS: User[] = [
  { id: '1', name: 'Patchouli', avatar: 'https://picsum.photos/200', role: 'admin' },
  { id: '2', name: 'Marisa', avatar: 'https://picsum.photos/201', role: 'user' },
  { id: '3', name: 'Alice', avatar: 'https://picsum.photos/202', role: 'user', banned: true },
];

const MOCK_ITEMS: KnowledgeItem[] = [
  {
    id: '101',
    title: 'Grimoire Maintenance Protocols',
    content: '# Protocols\n\nAlways keep the library dry.\n\n## Humidity Control\nUse magic stones to absorb moisture.',
    tags: ['Script', 'Entity'],
    status: 'published',
    author: MOCK_USERS[0],
    createdAt: '2023-10-24T10:00:00Z',
    aiClues: 'Book preservation, Library magic, Environment control'
  },
  {
    id: '102',
    title: 'Advanced Spell Casting',
    content: 'Focus on your breathing.',
    tags: ['Block'],
    status: 'pending',
    author: MOCK_USERS[1],
    createdAt: '2023-10-25T14:30:00Z',
    aiClues: 'Magic technique, Breathing exercise'
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<KnowledgeItem[]>(MOCK_ITEMS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentPage, setCurrentPage] = useState<Page>(Page.LOGIN);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Navigation Logic
  const goTo = (page: Page, itemId?: string) => {
    if (itemId) setSelectedItemId(itemId);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Check Auth on Init
  useEffect(() => {
    // Simulate session check
    const storedUser = localStorage.getItem('patchouli_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setCurrentPage(Page.HOME);
    }
  }, []);

  const handleLogin = () => {
    // Simulate OAuth Login - Pick generic admin
    const user = MOCK_USERS[0];
    localStorage.setItem('patchouli_user', JSON.stringify(user));
    setCurrentUser(user);
    goTo(Page.HOME);
  };

  const handleLogout = () => {
    localStorage.removeItem('patchouli_user');
    setCurrentUser(null);
    goTo(Page.LOGIN);
  };

  const renderPage = () => {
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
    <AppContext.Provider value={{ currentUser, setCurrentUser, items, setItems, users, setUsers, currentPage, setCurrentPage, selectedItemId, setSelectedItemId }}>
      <div className="min-h-screen bg-[#FDFDFD] text-[#1A1C1E] font-roboto selection:bg-slate-200">
        {/* Header (Top App Bar) - Visible everywhere except Login */}
        {currentPage !== Page.LOGIN && (
          <header className="fixed top-0 left-0 right-0 h-16 bg-[#FDFDFD]/80 backdrop-blur-md z-40 px-4 flex items-center justify-between border-b border-slate-100/50">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => goTo(Page.HOME)}>
               <span className="material-symbols-rounded text-slate-700">library_books</span>
               <span className="font-bold text-lg tracking-tight">Patchouli</span>
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
                   <div className="absolute right-0 top-12 w-48 bg-[#F0F4F8] rounded-2xl shadow-xl p-2 hidden group-hover:block transition-all opacity-0 group-hover:opacity-100 transform origin-top-right">
                     <div className="px-4 py-2 text-xs text-slate-500 font-bold uppercase">Account</div>
                     <button onClick={() => goTo(Page.HOME)} className="w-full text-left px-4 py-3 hover:bg-slate-200 rounded-xl text-sm mb-1">My Knowledge</button>
                     <button onClick={handleLogout} className="w-full text-left px-4 py-3 hover:bg-red-100 text-red-700 rounded-xl text-sm">Logout</button>
                   </div>
                 </div>
               </div>
             )}
          </header>
        )}
        
        {/* Main Content Area */}
        <main className={`${currentPage !== Page.LOGIN ? 'pt-16' : ''}`}>
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;
