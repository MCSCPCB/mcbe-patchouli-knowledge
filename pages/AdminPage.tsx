import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { IconButton, Switch, Avatar, Chip } from '../components/M3Components';

const AdminPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const { items, setItems, users, setUsers } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState<'audit' | 'users'>('audit');

  const pendingItems = items.filter(i => i.status === 'pending');

  const handleApprove = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, status: 'published' } : i));
  };

  const handleReject = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, status: 'rejected' } : i));
  };

  const toggleBan = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, banned: !u.banned } : u));
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FDFDFD]">
      {/* Navigation Rail for Desktop / Tabs for Mobile */}
      <div className="md:w-64 md:border-r border-slate-200 md:h-screen sticky top-16 bg-[#FDFDFD] z-20 flex md:flex-col gap-2 p-4 border-b md:border-b-0">
         <h2 className="text-xl font-bold px-4 mb-4 hidden md:block">Dashboard</h2>
         
         <button 
           onClick={() => setActiveTab('audit')}
           className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${activeTab === 'audit' ? 'bg-slate-200 font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
         >
           <span className="material-symbols-rounded">gavel</span>
           Audit Queue
           {pendingItems.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingItems.length}</span>}
         </button>

         <button 
           onClick={() => setActiveTab('users')}
           className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${activeTab === 'users' ? 'bg-slate-200 font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
         >
           <span className="material-symbols-rounded">group</span>
           User Management
         </button>

         <div className="mt-auto hidden md:block px-4 pb-20">
            <button onClick={() => onNavigate(Page.HOME)} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-2">
              <span className="material-symbols-rounded">arrow_back</span> Back to Home
            </button>
         </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-4xl">
        {activeTab === 'audit' && (
          <div className="space-y-4">
             <h3 className="text-2xl font-bold mb-6">Pending Review</h3>
             {pendingItems.length === 0 ? (
               <div className="text-slate-500 text-center py-10 bg-slate-50 rounded-[24px]">All caught up! No items to review.</div>
             ) : (
               pendingItems.map(item => (
                 <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-[20px] flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">{item.content}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>by {item.author.name}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                       <IconButton icon="close" className="bg-red-50 text-red-600 hover:bg-red-100" onClick={() => handleReject(item.id)} />
                       <IconButton icon="check" className="bg-green-50 text-green-600 hover:bg-green-100" onClick={() => handleApprove(item.id)} />
                    </div>
                 </div>
               ))
             )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-6">All Users</h3>
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-[20px]">
                 <div className="flex items-center gap-4">
                    <Avatar name={user.name} src={user.avatar} />
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {user.name} 
                        {user.role === 'admin' && <Chip label="Admin" className="h-5 text-[10px] px-1" />}
                      </div>
                      <div className="text-xs text-slate-500">ID: {user.id}</div>
                    </div>
                 </div>
                 {user.role !== 'admin' && (
                   <div className="flex items-center gap-2">
                     <span className={`text-sm font-medium ${user.banned ? 'text-red-500' : 'text-slate-500'}`}>
                       {user.banned ? 'Banned' : 'Active'}
                     </span>
                     <Switch checked={!!user.banned} onChange={() => toggleBan(user.id)} />
                   </div>
                 )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
