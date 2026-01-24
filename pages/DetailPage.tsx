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

          <div className="bg-slate-50 rounded-[20px] p-6 md:p-10 mb-8 border border-slate-100 shadow-sm min-h-[300px] whitespace-pre-wrap font-roboto text-slate-800 leading-relaxed">
            {/* Simple Markdown Simulation */}
            {item.content}
          </div>
       </article>
       
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
