import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { IconButton, Dialog, Button, Avatar } from '../components/M3Components';
import { deletePost, getRecentPosts } from '../services/knowledgeService';

// === 修改点 1: 引入 highlight.js 及其深色主题样式 ===
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css'; // 选择了一个契合你应用黑底风格的主题

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
        alert("Delete failed"); // 这里的 alert 实际项目中也可以换成 Dialog
    }
  };

  const canEdit = (currentUser?.role === 'admin') || 
                (currentUser?.id === item.author.id && item.status === 'pending');

  const parseMarkdown = (text: string) => {
    const codeBlocks: string[] = [];
    const inlineCodes: string[] = [];
    const videoTags: string[] = [];

    // 1. Extract Videos (保留你的视频解析逻辑)
    let processed = text.replace(/<video([\s\S]*?)<\/video>/g, (match) => {
        videoTags.push(match);
        return `___VIDEO_TAG_${videoTags.length - 1}___`;
    });
    
    // 辅助：HTML 转义（用于非代码块部分，highlight.js 会自动处理代码块内的转义）
    const escapeHtml = (unsafe: string) => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    // === 修改点 2: 使用 highlight.js 处理代码块 ===
    // 正则捕获：Group 1 是语言(可选), Group 2 是代码内容
    processed = processed.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, lang, code) => {
        const cleanCode = code.trim(); // 去除首尾多余空白
        let highlightedHtml = '';
        
        try {
            if (lang && hljs.getLanguage(lang)) {
                // 如果指定了语言且 hljs 支持
                highlightedHtml = hljs.highlight(cleanCode, { language: lang }).value;
            } else {
                // 否则自动检测
                highlightedHtml = hljs.highlightAuto(cleanCode).value;
            }
        } catch (e) {
            // 降级处理
            highlightedHtml = escapeHtml(cleanCode);
        }

        codeBlocks.push(highlightedHtml);
        return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    });

    // 3. Extract Inline Code
    processed = processed.replace(/`([^`]+)`/g, (match, code) => {
        inlineCodes.push(escapeHtml(code));
        return `___INLINE_CODE_${inlineCodes.length - 1}___`;
    });

    // 4. Basic formatting (Markdown 基础语法)
    processed = processed
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-6 w-full shadow-lg"/>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#E6E6E6] font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-[#B0B0B0] font-serif">$1</em>')
        .replace(/~~(.*?)~~/g, '<del class="opacity-60">$1</del>')
        .replace(/<u>(.*?)<\/u>/g, '<u class="decoration-[#7DA3A1] decoration-2 underline-offset-4">$1</u>');

    // 5. Restore Inline Code
    processed = processed.replace(/___INLINE_CODE_(\d+)___/g, (match, index) => {
        return `<code class="bg-[#2D2D2D] text-[#A5C9A1] px-1.5 py-0.5 rounded text-sm font-mono border border-[#444]">${inlineCodes[parseInt(index)]}</code>`;
    });

    // 6. Restore Code Blocks (渲染 highlight.js 的结果)
    processed = processed.replace(/___CODE_BLOCK_(\d+)___/g, (match, index) => {
        // 注意：这里移除了手写的 style color，依靠 highlight.js 的 css 类名
        // 保留了外部容器的样式以维持布局美观
        return `
            <div class="relative group my-6">
                <div class="absolute -top-3 right-4 px-2 py-0.5 bg-[#333] rounded text-[10px] text-[#888] font-mono border border-[#444] select-none">CODE</div>
                <pre class="bg-[#1e2024] !bg-[#1e2024] rounded-2xl p-5 overflow-x-auto border border-[#333] shadow-inner scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
                  <code class="hljs !bg-transparent !p-0 font-mono text-sm leading-relaxed">${codeBlocks[parseInt(index)]}</code>
                </pre>
            </div>
        `;
    });

    // 7. Restore Videos
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
                    <div className="text-[#8C918C] text-xs">更新于 {new Date(item.createdAt).toLocaleDateString()}</div>
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
           
           {/* 修改点：添加 whitespace-pre-wrap 以支持换行显示 */}
           <p className="text-[#E6E1E5] text-sm italic leading-relaxed relative z-10 whitespace-pre-wrap font-sans">
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
             <Button variant="text" label="Cancel" onClick={() => setDeleteDialogOpen(false)} />
             <Button variant="filled" className="!bg-[#CF6679] !text-[#37000B]" label="Delete" onClick={handleDelete} />
           </>
         }
       >
         你真的要删除这个知识吗？ <strong className="text-white">{item.title}</strong> 将会永远消失！（真的很久！）.
       </Dialog>
    </div>
  );
};

export default DetailPage;
