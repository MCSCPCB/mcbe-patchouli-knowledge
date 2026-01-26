import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Page, KnowledgeItem } from '../types';
import { IconButton, Switch, Avatar, Chip, Button } from '../components/M3Components';
import { getPendingPosts, approvePost, rejectPost, toggleUserBan, getAllUsers } from '../services/knowledgeService';

const AdminPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const { items, setItems, users, setUsers, refreshData } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState<'audit' | 'users'>('audit');
  const [pendingItems, setPendingItems] = useState<KnowledgeItem[]>([]); 

  useEffect(() => {
    if (activeTab === 'audit') {
        getPendingPosts().then(setPendingItems);
    } else {
        getAllUsers().then(setUsers);
    }
  }, [activeTab, setUsers]);

  const handleApprove = async (id: string) => {
    try {
        await approvePost(id);
        setPendingItems(prev => prev.filter(i => i.id !== id));
        refreshData();
    } catch (e) {
        alert("Action failed");
    }
  };

  const handleReject = async (id: string) => {
    try {
        await rejectPost(id);
        setPendingItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
        alert("Action failed");
    }
  };

  const toggleBan = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    try {
        await toggleUserBan(userId, !user.banned);
        setUsers(users.map(u => u.id === userId ? { ...u, banned: !u.banned } : u));
    } catch (e) {
        alert("Action failed");
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#121212] animate-[fadeIn_0.3s_ease-out]">
      {/* Navigation Rail (Desktop) / Header (Mobile) */}
      <div className="md:w-72 md:h-screen sticky top-0 bg-[#1E1E1E] md:border-r border-[#2C2C2C] z-20 flex flex-col p-4 md:p-6 shadow-xl md:shadow-none">
         <div className="flex items-center gap-3 mb-6 md:mb-10">
            <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} className="md:hidden" />
            <div className="flex flex-col">
                <h2 className="text-2xl font-normal text-[#E6E6E6]">管理员</h2>
                <span className="text-xs text-[#8C918C] uppercase tracking-widest">控制面板</span>
            </div>
         </div>
         
         {/* Mobile Segmented Button */}
         <div className="flex md:hidden bg-[#2C2C2C] rounded-full p-1 mb-4 relative overflow-hidden">
             {/* Slider logic could be added here, but simple conditional classes work for M3 */}
            <button 
                onClick={() => setActiveTab('audit')} 
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'audit' ? 'bg-[#7DA3A1] text-[#0F1D13] shadow-sm' : 'text-[#C7C7CC]'}`}
            >
                审核
            </button>
            <button 
                onClick={() => setActiveTab('users')} 
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-[#7DA3A1] text-[#0F1D13] shadow-sm' : 'text-[#C7C7CC]'}`}
            >
                成员
            </button>
         </div>

         {/* Desktop Navigation Items */}
         <div className="hidden md:flex flex-col gap-2">
            <button 
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all text-sm font-medium tracking-wide
                    ${activeTab === 'audit' ? 'bg-[#7DA3A1]/20 text-[#7DA3A1]' : 'text-[#C7C7CC] hover:bg-[#2C2C2C]'}
                `}
            >
                <span className="material-symbols-rounded">gavel</span>
                审核队列
                {pendingItems.length > 0 && (
                    <span className="ml-auto bg-[#CF6679] text-[#37000B] text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingItems.length}
                    </span>
                )}
            </button>

            <button 
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all text-sm font-medium tracking-wide
                    ${activeTab === 'users' ? 'bg-[#7DA3A1]/20 text-[#7DA3A1]' : 'text-[#C7C7CC] hover:bg-[#2C2C2C]'}
                `}
            >
                <span className="material-symbols-rounded">group</span>
                成员管理
            </button>
         </div>

         <div className="mt-auto hidden md:block">
            <Button 
                variant="text" 
                label="Return Home" 
                icon="arrow_back" 
                onClick={() => onNavigate(Page.HOME)} 
                fullWidth 
                className="!justify-start !pl-4 text-[#8C918C]"
            />
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-10 max-w-5xl overflow-y-auto">
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-[slideUp_0.3s_ease-out]">
             <h3 className="text-xl text-[#E6E6E6] mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-[#7DA3A1]">pending_actions</span>
                待审阅
             </h3>
             
             {pendingItems.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 bg-[#1E1E1E] rounded-[24px] border border-[#2C2C2C]">
                 <span className="material-symbols-rounded text-5xl text-[#333] mb-4">task_alt</span>
                 <span className="text-[#8C918C]">待审队列空空如也 (●ˇ∀ˇ●)</span>
               </div>
             ) : (
               pendingItems.map(item => (
                 <div key={item.id} className="bg-[#1E1E1E] rounded-[24px] p-6 hover:shadow-lg transition-shadow border border-[#2C2C2C] flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-medium text-lg text-[#E6E6E6] mb-1">{item.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-[#8C918C]">
                                <span>{item.author.name}</span>
                                <span className="w-1 h-1 rounded-full bg-[#444]"></span>
                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-sm text-[#C7C7CC] line-clamp-2 leading-relaxed bg-[#252529] p-3 rounded-xl">
                        {item.content}
                    </p>

                    <div className="flex gap-3 justify-end pt-2">
                       <Button 
                            variant="outlined" 
                            label="拒绝" 
                            icon="close"
                            className="!border-[#CF6679] !text-[#CF6679] hover:!bg-[#CF6679]/10"
                            onClick={() => handleReject(item.id)} 
                       />
                       <Button 
                            variant="filled" 
                            label="批准" 
                            icon="check"
                            onClick={() => handleApprove(item.id)} 
                       />
                    </div>
                 </div>
               ))
             )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4 animate-[slideUp_0.3s_ease-out]">
            <h3 className="text-xl text-[#E6E6E6] mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-[#7DA3A1]">manage_accounts</span>
                所有成员
            </h3>
            
            <div className="bg-[#1E1E1E] rounded-[24px] overflow-hidden border border-[#2C2C2C]">
                {users.map((user, index) => (
                <div key={user.id} className={`flex items-center justify-between p-4 hover:bg-[#252529] transition-colors ${index !== users.length - 1 ? 'border-b border-[#2C2C2C]' : ''}`}>
                    <div className="flex items-center gap-4">
                        <Avatar name={user.name} src={user.avatar} />
                        <div>
                        <div className="font-medium text-[#E6E6E6] flex items-center gap-2">
                            {user.name} 
                            {user.role === 'admin' && (
                                <span className="bg-[#D0BCFF] text-[#381E72] text-[10px] px-2 py-0.5 rounded-full font-bold">管理员</span>
                            )}
                        </div>
                        <div className="text-[10px] text-[#707070] font-mono">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                    </div>
                    
                    {user.role !== 'admin' && (
                    <div className="flex items-center gap-4">
                        <span className={`text-xs font-medium uppercase tracking-wider ${user.banned ? 'text-[#CF6679]' : 'text-[#8FBC8F]'}`}>
                        {user.banned ? '已封禁' : '活跃中'}
                        </span>
                        <Switch checked={!!user.banned} onChange={() => toggleBan(user.id)} />
                    </div>
                    )}
                </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
