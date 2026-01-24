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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#313233]">
      {/* Navigation Rail/Panel */}
      <div className="md:w-64 border-r-2 border-[#1e1e1f] md:h-screen sticky top-16 bg-[#2b2b2b] z-20 flex md:flex-col gap-2 p-4 border-b-2 md:border-b-0">
         <h2 className="text-xl font-bold font-mc px-4 mb-4 hidden md:block text-[#e0e0e0]">Admin Panel</h2>
         
         <button 
           onClick={() => setActiveTab('audit')}
           className={`flex items-center gap-3 px-4 py-3 font-mc text-lg border-2 transition-all ${activeTab === 'audit' ? 'bg-[#313233] border-white text-white' : 'border-transparent text-[#b0b0b0] hover:bg-[#313233]'}`}
         >
           <span className="material-symbols-rounded">gavel</span>
           Audit Queue
           {pendingItems.length > 0 && <span className="ml-auto bg-[#8B0000] text-white text-[12px] font-bold px-2 border border-[#B22222]">{pendingItems.length}</span>}
         </button>

         <button 
           onClick={() => setActiveTab('users')}
           className={`flex items-center gap-3 px-4 py-3 font-mc text-lg border-2 transition-all ${activeTab === 'users' ? 'bg-[#313233] border-white text-white' : 'border-transparent text-[#b0b0b0] hover:bg-[#313233]'}`}
         >
           <span className="material-symbols-rounded">group</span>
           User Management
         </button>

         <div className="mt-auto hidden md:block px-4 pb-20">
            <button onClick={() => onNavigate(Page.HOME)} className="text-sm font-mc text-[#b0b0b0] hover:text-white flex items-center gap-2">
              <span className="material-symbols-rounded">arrow_back</span> Return
            </button>
         </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-5xl">
        {activeTab === 'audit' && (
          <div className="space-y-4">
             <h3 className="text-2xl font-bold font-mc mb-6 text-white uppercase">Pending Review</h3>
             {pendingItems.length === 0 ? (
               <div className="text-[#707070] font-mc text-center py-10 bg-[#2b2b2b] border-2 border-[#1e1e1f]">Inventory Empty.</div>
             ) : (
               pendingItems.map(item => (
                 <div key={item.id} className="bg-[#313233] border-2 border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f] p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold font-mc text-lg mb-1 text-white">{item.title}</h4>
                      <p className="text-sm font-mono text-[#b0b0b0] line-clamp-2 mb-2">{item.content}</p>
                      <div className="flex items-center gap-2 text-xs font-mc text-[#707070]">
                        <span>by {item.author.name}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end border-t border-[#1e1e1f] md:border-t-0 pt-2 md:pt-0">
                       <IconButton icon="close" className="!bg-[#8B0000] !border-[#B22222]" onClick={() => handleReject(item.id)} />
                       <IconButton icon="check" className="!bg-[#3C8527] !border-[#52A535]" onClick={() => handleApprove(item.id)} />
                    </div>
                 </div>
               ))
             )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <h3 className="text-2xl font-bold font-mc mb-6 text-white uppercase">All Users</h3>
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-[#313233] border-2 border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f]">
                 <div className="flex items-center gap-4">
                    <Avatar name={user.name} src={user.avatar} />
                    <div>
                      <div className="font-bold font-mc text-white flex items-center gap-2">
                        {user.name} 
                        {user.role === 'admin' && <Chip label="OP" className="h-5 text-[10px] px-1 bg-[#b465f5]" />}
                      </div>
                      <div className="text-xs font-mono text-[#707070]">UUID: {user.id}</div>
                    </div>
                 </div>
                 {user.role !== 'admin' && (
                   <div className="flex items-center gap-4 bg-[#1e1e1f] p-2 border border-[#000]">
                     <span className={`text-sm font-mc ${user.banned ? 'text-[#ff5555]' : 'text-[#52A535]'}`}>
                       {user.banned ? 'BANNED' : 'ACTIVE'}
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