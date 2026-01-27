import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { IconButton, Dialog, Button, Avatar } from '../components/M3Components';
import { deletePost, getRecentPosts } from '../services/knowledgeService';
import { MarkdownRenderer,InlineMarkdown } from '../components/MarkdownElements'; // 引入新组件

const DetailPage: React.FC<{ onNavigate: (p: Page) => void; itemId: string | null }> = ({ onNavigate, itemId }) => {
  const { items, setItems, currentUser, refreshData } = useContext(AppContext);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const item = items.find(i => i.id === itemId);
  if (!item) return <div className="p-8 text-center text-[#888]">Item not found</div>;

  const handleDelete = async () => {
    try {
        await deletePost(item.id);
        const posts = await getRecentPosts();
        setItems(posts);
        await refreshData();
        setDeleteDialogOpen(false);
        onNavigate(Page.HOME);
    } catch (e) {
        alert("Delete failed");
    }
  };

  const canEdit = (currentUser?.role === 'admin') || 
                (currentUser?.id === item.author.id && item.status === 'pending');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-32 animate-[fadeIn_0.3s_ease-out]">
       {/* Actions Header */}
       <div className="mb-6 flex items-center justify-between sticky top-20 z-10 pointer-events-none">
         <div className="pointer-events-auto bg-[#121212]/50 backdrop-blur-md rounded-full p-1">
            <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} />
         </div>
         {canEdit && (
           <div className="flex gap-2 pointer-events-auto bg-[#121212]/50 backdrop-blur-md rounded-full p-1">
             <IconButton icon="edit" title="Edit" onClick={() => onNavigate(Page.CREATE, item.id)} />
             <IconButton icon="delete" title="Delete" onClick={() => setDeleteDialogOpen(true)} className="!text-[#CF6679] hover:!bg-[#CF6679]/10" />
           </div>
         )}
       </div>

       <article>
          {/* Title Section */}
          <div className="mb-8">
            <div className="flex gap-2 mb-4">
                {item.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium text-[#7DA3A1] bg-[#7DA3A1]/10 px-2 py-1 rounded-md">#{tag}</span>
                ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-medium text-[#E6E6E6] leading-tight mb-6 tracking-tight"><InlineMarkdown content={item.title} /></h1>
            <div className="flex items-center gap-4 py-4 border-t border-b border-[#2C2C2C]">
                <Avatar name={item.author.name} src={item.author.avatar} size="md" />
                <div>
                    <div className="font-medium text-[#E6E6E6]">{item.author.name}</div>
                    <div className="text-[#8C918C] text-xs">发布于 {new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
                {item.status === 'pending' && (
                    <span className="ml-auto bg-[#FFD8E4] text-[#31111D] px-3 py-1 rounded-full text-xs font-bold">Pending Approval</span>
                )}
            </div>
          </div>

          {/* Main Content - 使用新的渲染器 */}
          <div className="min-h-[200px] text-[#C7C7CC]">
             <MarkdownRenderer content={item.content} />
          </div>
       </article>
       
       {/* Attachments Section */}
       {item.attachments && item.attachments.length > 0 && (
           <div className="mt-12 pt-6 border-t border-[#2C2C2C]">
               <h3 className="text-sm font-bold text-[#8C918C] uppercase tracking-wider mb-4 flex items-center gap-2">
                   <span className="material-symbols-rounded">attachment</span>
                   附件
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {item.attachments.map(att => (
                       <a 
                         key={att.id} 
                         href={att.url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center gap-4 p-3 bg-[#252529] rounded-xl hover:bg-[#2F2F34] transition-colors border border-transparent hover:border-[#444]"
                       >
                           <div className="w-10 h-10 rounded-lg bg-[#333] flex items-center justify-center text-[#E6E6E6]">
                               <span className="material-symbols-rounded">description</span>
                           </div>
                           <div className="overflow-hidden">
                               <div className="font-medium text-[#E6E6E6] text-sm truncate">{att.name}</div>
                               <div className="text-xs text-[#8C918C] truncate opacity-70">{att.url}</div>
                           </div>
                           <span className="material-symbols-rounded ml-auto text-[#8C918C] text-lg">open_in_new</span>
                       </a>
                   ))}
               </div>
           </div>
       )}

       {/* AI Insight Card */}
       {item.aiClues && (
         <div className="mt-12 bg-[#D0BCFF]/5 border border-[#D0BCFF]/20 rounded-2xl p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
               <span className="material-symbols-rounded text-6xl text-[#D0BCFF]">auto_awesome</span>
           </div>
           <span className="text-[#D0BCFF] text-xs font-bold uppercase tracking-widest mb-2 block">检索线索</span>
           {/* 线索部分也添加了 break-words 和 whitespace 处理 */}
           <p className="text-[#E6E1E5] text-sm italic leading-relaxed relative z-10 whitespace-pre-wrap font-sans break-words">
             {item.aiClues}
           </p>
         </div>
       )}

       <Dialog 
         open={deleteDialogOpen} 
         title="删除知识" 
         onClose={() => setDeleteDialogOpen(false)}
         actions={
           <>
             <Button variant="text" label="取消" onClick={() => setDeleteDialogOpen(false)} />
             <Button variant="filled" className="!bg-[#CF6679] !text-[#37000B]" label="删除" onClick={handleDelete} />
           </>
         }
       >
         你真的要删除这个知识吗？
         <div><strong className="text-white">{item.title}</strong> 将会永远消失! (真的很久)</div>
       </Dialog>
    </div>
  );
};

export default DetailPage;
