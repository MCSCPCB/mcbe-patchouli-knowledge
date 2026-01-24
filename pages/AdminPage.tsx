import React, { useState, useEffect } from 'react';
import { Page, User, KnowledgePost } from '../types';
import { IconButton } from '../components/M3Components';
import { getPendingPosts, approvePost, deletePost, getAllUsers, toggleUserBan } from '../services/knowledgeService';

const AdminPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'users'>('audit');
  
  // Real Data State
  const [pendingItems, setPendingItems] = useState<KnowledgePost[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'audit') {
        const posts = await getPendingPosts();
        setPendingItems(posts);
      } else {
        const users = await getAllUsers();
        setAllUsers(users);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 审核操作
  const handleApprove = async (id: string) => {
    if (!confirm('Approve this item?')) return;
    await approvePost(id);
    setPendingItems(prev => prev.filter(i => i.id !== id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item permanently?')) return;
    await deletePost(id);
    setPendingItems(prev => prev.filter(i => i.id !== id));
  };

  // 用户操作
  const handleBan = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Confirm ${currentStatus ? 'Unban' : 'Ban'} user?`)) return;
    await toggleUserBan(id, !currentStatus);
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned: !currentStatus } : u));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between mb-8 border-b-4 border-[#1e1e1f] pb-4">
          <div className="flex items-center gap-4">
             <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} />
             <h1 className="text-3xl font-bold font-mc text-white tracking-wide">ADMIN CONSOLE</h1>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-[#1e1e1f] border-2 border-[#5b5b5c] p-1">
             <button 
               onClick={() => setActiveTab('audit')}
               className={`px-6 py-2 font-mc text-sm uppercase transition-colors ${activeTab === 'audit' ? 'bg-white text-black' : 'text-[#b0b0b0] hover:text-white'}`}
             >
               Audit Queue ({pendingItems.length})
             </button>
             <button 
               onClick={() => setActiveTab('users')}
               className={`px-6 py-2 font-mc text-sm uppercase transition-colors ${activeTab === 'users' ? 'bg-white text-black' : 'text-[#b0b0b0] hover:text-white'}`}
             >
               Users ({allUsers.length})
             </button>
          </div>
       </div>

       {isLoading ? (
         <div className="text-white font-mc text-center py-10">LOADING DATA...</div>
       ) : (
         <>
           {/* Audit List */}
           {activeTab === 'audit' && (
              <div className="flex flex-col gap-4">
                {pendingItems.length === 0 ? (
                  <div className="text-[#5b5b5c] font-mono text-center py-20 border-2 border-dashed border-[#2b2b2b]">NO PENDING ITEMS</div>
                ) : (
                  pendingItems.map(item => (
                    <div key={item.id} className="bg-[#2b2b2b] border-l-4 border-yellow-500 p-4 flex items-center justify-between group hover:bg-[#333] transition-colors">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="bg-[#1e1e1f] text-yellow-500 text-[10px] font-bold font-mc px-1 border border-yellow-500">PENDING</span>
                             <span className="text-[#b0b0b0] font-mono text-xs">{item.type}</span>
                          </div>
                          <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                          <p className="text-[#888] font-mono text-xs line-clamp-1">{item.content}</p>
                       </div>
                       <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleApprove(item.id)} className="p-2 border-2 border-[#3C8527] text-[#3C8527] hover:bg-[#3C8527] hover:text-white transition-colors">
                             <span className="material-symbols-rounded">check</span>
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 border-2 border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000] hover:text-white transition-colors">
                             <span className="material-symbols-rounded">close</span>
                          </button>
                       </div>
                    </div>
                  ))
                )}
              </div>
           )}

           {/* User List */}
           {activeTab === 'users' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {allUsers.map(user => (
                   <div key={user.id} className="bg-[#1e1e1f] border-2 border-[#2b2b2b] p-4 flex items-center gap-4 relative overflow-hidden">
                      <img src={user.avatar} className="w-12 h-12 bg-black border border-[#5b5b5c]" alt=""/>
                      <div>
                         <div className="font-mc text-white flex items-center gap-2">
                           {user.name}
                           {user.role === 'admin' && <span className="text-[10px] bg-[#3C8527] px-1">OP</span>}
                           {user.isBanned && <span className="text-[10px] bg-[#8B0000] px-1">BANNED</span>}
                         </div>
                         <div className="text-[#5b5b5c] font-mono text-xs truncate max-w-[200px]">{user.id}</div>
                      </div>
                      
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleBan(user.id, user.isBanned || false)}
                          className={`ml-auto px-3 py-1 font-mc text-xs border-2 transition-colors ${
                             user.isBanned 
                             ? 'border-white text-white hover:bg-white hover:text-black' 
                             : 'border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000] hover:text-white'
                          }`}
                        >
                          {user.isBanned ? 'UNBAN' : 'BAN'}
                        </button>
                      )}
                   </div>
                 ))}
              </div>
           )}
         </>
       )}
    </div>
  );
};

export default AdminPage;
