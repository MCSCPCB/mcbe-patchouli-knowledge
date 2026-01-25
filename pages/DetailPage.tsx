import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { IconButton, Dialog, Button, Avatar } from '../components/M3Components';
import { deletePost, getRecentPosts } from '../services/knowledgeService';

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

  // === 修改点 2: 增加简易语法高亮逻辑 ===
  const highlightSyntax = (code: string) => {
    let highlighted = code;
    // 字符串
    highlighted = highlighted.replace(/(['"`])(.*?)\1/g, '<span style="color: #A5C9A1;">$1$2$1</span>');
    // 关键字
    highlighted = highlighted.replace(/\b(const|let|var|function|return|import|from|export|default|class|if|else|for|while|try|catch|async|await|new|this)\b/g, '<span style="color: #D0BCFF;">$1</span>');
    // 数字
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span style="color: #FFB74D;">$1</span>');
    // 布尔值/Null
    highlighted = highlighted.replace(/\b(true|false|null|undefined)\b/g, '<span style="color: #FF80AB;">$1</span>');
    return highlighted;
  };

  const parseMarkdown = (text: string) => {
    const codeBlocks: string[] = [];
    const inlineCodes: string[] = [];
    const videoTags: string[] = [];

    // Extract Videos
    let processed = text.replace(/<video([\s\S]*?)<\/video>/g, (match) => {
        videoTags.push(match);
        return `___VIDEO_TAG_${videoTags.length - 1}___`;
    });
    
    const escapeHtml = (unsafe: string) => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    // Extract Code Blocks and Apply Highlight
    processed = processed.replace(/```([\s\S]*?)```/g, (match, code) => {
        const escapedCode = escapeHtml(code);
        const highlightedCode = highlightSyntax(escapedCode);
        codeBlocks.push(highlightedCode);
        return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    });

    // Extract Inline Code
    processed = processed.replace(/`([^`]+)`/g, (match, code) => {
        inlineCodes.push(escapeHtml(code));
        return `___INLINE_CODE_${inlineCodes.length - 1}___`;
    });

    // Basic formatting
    processed = processed
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-6 w-full shadow-lg"/>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#E6E6E6] font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-[#B0B0B0] font-serif">$1</em>')
        .replace(/~~(.*?)~~/g, '<del class="opacity-60">$1</del>')
        .replace(/<u>(.*?)<\/u>/g, '<u class="decoration-[#7DA3A1] decoration-2 underline-offset-4">$1</u>');

    // Restore Inline Code
    processed = processed.replace(/___INLINE_CODE_(\d+)___/g, (match, index) => {
        return `<code class="bg-[#2D2D2D] text-[#A5C9A1] px-1.5 py-0.5 rounded text-sm font-mono border border-[#444]">${inlineCodes[parseInt(index)]}</code>`;
    });

    // Restore Code Blocks (Enhanced Style)
    processed = processed.replace(/___CODE_BLOCK_(\d+)___/g, (match, index) => {
        return `
            <div class="relative group my-6">
                <div class="absolute -top-3 right-4 px-2 py-0.5 bg-[#333] rounded text-[10px] text-[#888] font-mono border border-[#444]">CODE</div>
                <pre class="bg-[#1A1A1A] rounded-2xl p-5 overflow-x-auto text-[#E6E6E6] border border-[#333] shadow-inner font-mono text-sm leading-relaxed">${codeBlocks[parseInt(index)]}</pre>
            </div>
        `;
    });

    // Restore Videos
    processed = processed.replace(/___VIDEO_TAG_(\d+)___/g, (match, index) => {
        return `<div class="rounded-xl overflow-hidden my-6 shadow-lg">${videoTags[parseInt(index)]}</div>`;
    });

    return processed;
  };

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
            <h1 className="text-4xl md:text-5xl font-medium text-[#E6E6E6] leading-tight mb-6 tracking-tight">{item.title}</h1>
            
            <div className="flex items-center gap-4 py-4 border-t border-b border-[#2C2C2C]">
                <Avatar name={item.author.name} src={item.author.avatar} size="md" />
                <div>
                    <div className="font-medium text-[#E6E6E6]">{item.author.name}</div>
                    <div className="text-[#8C918C] text-xs">Updated {new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
                {item.status === 'pending' && (
                    <span className="ml-auto bg-[#FFD8E4] text-[#31111D] px-3 py-1 rounded-full text-xs font-bold">Pending Approval</span>
                )}
            </div>
          </div>

          {/* Main Content */}
          <div 
             className="prose prose-invert prose-lg max-w-none text-[#C7C7CC] leading-relaxed whitespace-pre-wrap"
             dangerouslySetInnerHTML={{ __html: parseMarkdown(item.content) }}
          />
       </article>
       
       {/* Attachments Section */}
       {item.attachments && item.attachments.length > 0 && (
           <div className="mt-12 pt-6 border-t border-[#2C2C2C]">
               <h3 className="text-sm font-bold text-[#8C918C] uppercase tracking-wider mb-4 flex items-center gap-2">
                   <span className="material-symbols-rounded">attachment</span>
                   Resources
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
           <span className="text-[#D0BCFF] text-xs font-bold uppercase tracking-widest mb-2 block">Grimoire Insight</span>
           <p className="text-[#E6E1E5] text-sm italic leading-relaxed relative z-10">
             "{item.aiClues}"
           </p>
         </div>
       )}

       <Dialog 
         open={deleteDialogOpen} 
         title="Delete Article" 
         onClose={() => setDeleteDialogOpen(false)}
         actions={
           <>
             <Button variant="text" label="Cancel" onClick={() => setDeleteDialogOpen(false)} />
             <Button variant="filled" className="!bg-[#CF6679] !text-[#37000B]" label="Delete" onClick={handleDelete} />
           </>
         }
       >
         This action will permanently remove <strong className="text-white">{item.title}</strong> from the knowledge base.
       </Dialog>
    </div>
  );
};

export default DetailPage;
