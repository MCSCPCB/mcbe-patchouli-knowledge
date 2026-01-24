import React, { useState } from 'react';
import { Page, User, KnowledgePost } from '../types';
import { IconButton, Dialog, Button, Avatar } from '../components/M3Components';
import { deletePost } from '../services/knowledgeService';

// 更新了 Props 定义，不再依赖 Context
interface DetailPageProps {
  onNavigate: (p: Page) => void;
  itemId: string | null;
  // 这里我们假设父组件已经传了 item 进来，或者我们需要根据ID去查
  // 为了简单起见，且保持你App.tsx里的逻辑，我们暂时通过 ID 从 App 传下来的 items 里找
  // 但为了不修改 M3Components (它只导出了 UI)，我们需要在这里手动处理数据
}

// 注意：为了适配 App.tsx 传下来的 props (只传了 itemId)，我们需要在组件内部获取当前文章
// 但最好的方式是 App.tsx 直接传 item 对象。
// 鉴于 App.tsx 传的是 {onNavigate, itemId}，我们需要配合 AppContext 使用，
// 但你说要改成真实后端，所以这里我们稍微修改一下策略：
// 让 DetailPage 接收 item 数据，或者去 Context 里找。
// 既然 App.tsx 还是用了 AppContext，那我们还是得用 useContext，
// 只是数据源变成了真实数据。

import { AppContext } from '../App'; 
// ↑ 等等，之前的错误是因为 App.tsx 改了，找不到 AppContext。
// 现在 App.tsx (我刚发给你的版本) 已经重新导出了 AppContext，所以这里可以用 useContext 了！

const DetailPage: React.FC<{ onNavigate: (p: Page) => void; itemId: string | null }> = ({ onNavigate, itemId }) => {
  const { items, setItems, currentUser } = React.useContext(AppContext); // 恢复使用 Context
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const item = items.find(i => i.id === itemId);

  if (!item) return <div className="text-white p-10 text-center font-mc">ITEM NOT FOUND OR LOADING...</div>;

  const handleDelete = async () => {
    try {
      await deletePost(item.id); // 真实删除
      setItems(items.filter(i => i.id !== item.id)); // 本地更新
      setDeleteDialogOpen(false);
      onNavigate(Page.HOME);
    } catch (e) {
      alert('Delete failed');
    }
  };

  const isAuthorOrAdmin = currentUser?.id === item.author.id || currentUser?.role === 'admin';

  // 保留原汁原味的 Minecraft Markdown Parser
  const parseMarkdown = (text: string) => {
    const codeBlocks: string[] = [];
    const inlineCodes: string[] = [];
    const escapeHtml = (unsafe: string) => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    let processed = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        codeBlocks.push(escapeHtml(code));
        return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    });

    processed = processed.replace(/`([^`]+)`/g, (match, code) => {
        inlineCodes.push(escapeHtml(code));
        return `___INLINE_CODE_${inlineCodes.length - 1}___`;
    });

    processed = processed
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="border-2 border-[#1e1e1f] my-4 max-w-full"/>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-[#b0b0b0]">$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/<u>(.*?)<\/u>/g, '<u class="decoration-2">$1</u>');

    processed = processed.replace(/___INLINE_CODE_(\d+)___/g, (match, index) => {
        return `<code class="bg-[#1e1e1f] text-[#3C8527] px-1 border border-[#5b5b5c] font-mono">${inlineCodes[parseInt(index)]}</code>`;
    });

    processed = processed.replace(/___CODE_BLOCK_(\d+)___/g, (match, index) => {
        return `<pre class="bg-[#151515] border-2 border-[#5b5b5c] p-4 my-4 overflow-x-auto text-[#3C8527]"><code class="font-mono">${codeBlocks[parseInt(index)]}</code></pre>`;
    });

    return processed;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 animate-fade-in">
       {/* Header Actions */}
       <div className="mb-6 flex items-start justify-between">
         <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} />
         {isAuthorOrAdmin && (
           <div className="flex gap-2">
             <IconButton icon="delete" title="Delete" onClick={() => setDeleteDialogOpen(true)} className="!bg-[#8B0000] !border-[#B22222]" />
           </div>
         )}
       </div>

       <article className="prose prose-invert prose-lg max-w-none">
          {/* Title */}
          <h1 className="text-4xl font-bold font-mc text-white mb-4 border-b-4 border-[#1e1e1f] pb-2">{item.title}</h1>
          
          {/* Metadata */}
          <div className="flex items-center gap-3 mb-8 not-prose border-b-2 border-[#1e1e1f] pb-6">
             <Avatar name={item.author.name} src={item.author.avatar} />
             <div>
               <div className="font-bold font-mc text-white">{item.author.name}</div>
               <div className="text-[#b0b0b0] font-mono text-sm">Published {new Date(item.createdAt).toLocaleDateString()}</div>
             </div>
             {item.status === 'pending' && (
                <span className="ml-auto bg-[#FFA500] text-black px-3 py-1 font-mc text-xs font-bold uppercase border-2 border-white">Pending</span>
             )}
          </div>

          {/* Content */}
          <div 
             className="bg-[#2b2b2b] border-2 border-[#1e1e1f] p-6 md:p-10 mb-8 font-mono text-[#e0e0e0] leading-relaxed shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] whitespace-pre-wrap"
             dangerouslySetInnerHTML={{
                 __html: parseMarkdown(item.content)
             }}
          />
       </article>
       
       {/* Attachments */}
       {item.attachments && item.attachments.length > 0 && (
           <div className="mb-8">
               <h3 className="text-lg font-bold font-mc text-white mb-4 flex items-center gap-2">
                   <span className="material-symbols-rounded">attachment</span>
                   Attachments
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {item.attachments.map(att => (
                       <a 
                         key={att.id} 
                         href={att.url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center gap-4 p-4 bg-[#313233] border-2 border-b-[#1e1e1f] border-r-[#1e1e1f] border-t-[#5b5b5c] border-l-[#5b5b5c] hover:bg-[#3a3b3c] active:border-t-[#1e1e1f]"
                       >
                           <div className="w-10 h-10 bg-[#1e1e1f] flex items-center justify-center border border-[#5b5b5c]">
                               <span className="material-symbols-rounded text-[#b0b0b0]">description</span>
                           </div>
                           <div className="overflow-hidden">
                               <div className="font-medium font-mc text-white truncate">{att.name}</div>
                           </div>
                           <span className="material-symbols-rounded ml-auto text-[#b0b0b0]">open_in_new</span>
                       </a>
                   ))}
               </div>
           </div>
       )}

       {/* AI Clues Display */}
       {item.aiClues && (
         <div className="mt-8 p-4 bg-[#2b2b2b] border-2 border-[#b465f5] text-[#b465f5] text-sm font-mc shadow-[4px_4px_0_0_#000]">
           <span className="font-bold mr-2 text-white">AI Clues:</span>
           {item.aiClues}
         </div>
       )}

       <Dialog 
         open={deleteDialogOpen} 
         title="Confirm Deletion" 
         onClose={() => setDeleteDialogOpen(false)}
         actions={
           <>
             <Button variant="text" label="Cancel" onClick={() => setDeleteDialogOpen(false)} />
             <Button variant="filled" label="Delete" onClick={handleDelete} className="!bg-[#8B0000] !border-[#B22222]" />
           </>
         }
       >
         Are you sure you want to delete <strong className="text-white">{item.title}</strong>? <br/> This action cannot be undone.
       </Dialog>
    </div>
  );
};

export default DetailPage;
