import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { IconButton, Dialog, Button, Avatar } from '../components/M3Components';

const DetailPage: React.FC<{ onNavigate: (p: Page) => void; itemId: string | null }> = ({ onNavigate, itemId }) => {
  const { items, setItems, currentUser } = useContext(AppContext);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const item = items.find(i => i.id === itemId);

  if (!item) return <div>Item not found</div>;

  const handleDelete = () => {
    setItems(items.filter(i => i.id !== item.id));
    setDeleteDialogOpen(false);
    onNavigate(Page.HOME);
  };

  const isAuthorOrAdmin = currentUser?.id === item.author.id || currentUser?.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
       <div className="mb-6 flex items-start justify-between">
         <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} />
         {isAuthorOrAdmin && (
           <div className="flex gap-2">
             <IconButton icon="edit" title="Edit" />
             <IconButton icon="delete" title="Delete" onClick={() => setDeleteDialogOpen(true)} className="text-red-600 hover:bg-red-50" />
           </div>
         )}
       </div>

       <article className="prose prose-slate prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{item.title}</h1>
          
          <div className="flex items-center gap-3 mb-8 not-prose border-b border-slate-100 pb-6">
             <Avatar name={item.author.name} src={item.author.avatar} />
             <div>
               <div className="font-bold text-slate-900">{item.author.name}</div>
               <div className="text-slate-500 text-sm">Published on {new Date(item.createdAt).toLocaleDateString()}</div>
             </div>
             {item.status === 'pending' && (
                <span className="ml-auto bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Pending Review</span>
             )}
          </div>

          <div 
             className="bg-slate-50 rounded-[20px] p-6 md:p-10 mb-8 border border-slate-100 shadow-sm min-h-[300px] whitespace-pre-wrap font-roboto text-slate-800 leading-relaxed"
             dangerouslySetInnerHTML={{
                 __html: item.content
                     // Very basic markdown parsing simulation for display purposes
                     .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                     .replace(/\*(.*?)\*/g, '<em>$1</em>')
                     .replace(/~~(.*?)~~/g, '<del>$1</del>')
                     .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
                     .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 max-w-full"/>')
                     .replace(/`([^`]+)`/g, '<code class="bg-slate-200 px-1 rounded">$1</code>')
                     .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 text-white p-4 rounded-xl my-4 overflow-x-auto"><code>$1</code></pre>')
             }}
          />
       </article>
       
       {/* Attachments Section */}
       {item.attachments && item.attachments.length > 0 && (
           <div className="mb-8">
               <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
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
                         className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                       >
                           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                               <span className="material-symbols-rounded">description</span>
                           </div>
                           <div className="overflow-hidden">
                               <div className="font-medium text-slate-900 truncate">{att.name}</div>
                               <div className="text-xs text-slate-500 truncate">{att.url}</div>
                           </div>
                           <span className="material-symbols-rounded ml-auto text-slate-400">open_in_new</span>
                       </a>
                   ))}
               </div>
           </div>
       )}

       {item.aiClues && (
         <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900 text-sm">
           <span className="font-bold mr-2">✨ AI Clues:</span>
           {item.aiClues}
         </div>
       )}

       <Dialog 
         open={deleteDialogOpen} 
         title="Delete Knowledge?" 
         onClose={() => setDeleteDialogOpen(false)}
         actions={
           <>
             <Button variant="text" label="Cancel" onClick={() => setDeleteDialogOpen(false)} />
             <Button variant="filled" label="Delete" onClick={handleDelete} className="bg-red-600 hover:bg-red-700" />
           </>
         }
       >
         Are you sure you want to delete <strong>{item.title}</strong>? This action cannot be undone.
       </Dialog>
    </div>
  );
};

export default DetailPage;
