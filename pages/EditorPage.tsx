import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Page, KnowledgeItem, PREDEFINED_TAGS, Attachment } from '../types';
import { Button, IconButton, TextField, Select, Chip, RichMarkdownEditor } from '../components/M3Components';
import { generateSearchClues } from '../services/geminiService';

const EditorPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const { items, setItems, currentUser } = useContext(AppContext);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [aiClues, setAiClues] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // We use Select logic here but adapt it to simple array toggle
  const handleTagChange = (tag: string) => {
    // For this UI, since the dropdown is single select in its basic form,
    // we just add it to the list if not present.
    if (!tags.includes(tag)) {
        setTags([...tags, tag]);
    }
  };

  const handleGenerateClues = async () => {
    if (!content) return;
    setIsGenerating(true);
    try {
      const clues = await generateSearchClues(content);
      setAiClues(clues);
    } catch (e) {
      alert("AI Service Unavailable");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddAttachment = () => {
      const url = prompt("Enter attachment URL (file/link):");
      if(url) {
          const name = prompt("Enter attachment name:") || "Attachment";
          setAttachments([...attachments, {
              id: Date.now().toString(),
              name,
              type: 'link', // Simplification
              url
          }]);
      }
  };

  const handleSubmit = () => {
    if (!title || !content || !currentUser) return;
    
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      title,
      content,
      tags,
      aiClues,
      author: currentUser,
      status: 'pending', // Default to pending
      createdAt: new Date().toISOString(),
      attachments: attachments
    };
    
    setItems([newItem, ...items]);
    onNavigate(Page.HOME);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 animate-fade-in-up">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} />
        <h2 className="text-xl font-bold">New Knowledge</h2>
        <Button label="Submit" onClick={handleSubmit} variant="filled" disabled={!title || !content} />
      </div>

      <div className="space-y-6">
        <TextField 
          label="Title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="e.g., Advanced Potion Brewing"
        />

        {/* Tag Selection via Dropdown + Chip Display */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
           <div className="mb-4">
             <Select 
                label="Add a Category Tag"
                options={PREDEFINED_TAGS}
                value=""
                onChange={handleTagChange}
                placeholder="Select a tag..."
             />
           </div>
           
           <div className="flex flex-wrap gap-2">
             {tags.map(tag => (
               <Chip key={tag} label={tag} onDelete={() => setTags(tags.filter(t => t !== tag))} selected />
             ))}
             {tags.length === 0 && <span className="text-sm text-slate-400 italic mt-1">No tags selected</span>}
           </div>
        </div>

        {/* Rich Text Editor */}
        <RichMarkdownEditor 
          label="Content" 
          value={content} 
          onChange={setContent}
          onAddAttachment={handleAddAttachment}
        />

        {/* Attachment List Preview */}
        {attachments.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Attachments ({attachments.length})</h4>
                <div className="space-y-2">
                    {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                            <span className="material-symbols-rounded text-slate-400">attachment</span>
                            <span className="text-sm font-medium text-slate-700 flex-1 truncate">{att.name}</span>
                            <IconButton 
                                icon="delete" 
                                className="w-8 h-8 text-red-500 hover:bg-red-50" 
                                onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* AI Clue Generator Section */}
        <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-indigo-700">
               <span className="material-symbols-rounded">auto_awesome</span>
               <h3 className="font-bold text-sm uppercase tracking-wide">AI Search Clues</h3>
            </div>
            <Button 
              variant="tonal" 
              label={isGenerating ? "Thinking..." : "Generate"} 
              icon={!isGenerating ? "refresh" : undefined}
              onClick={handleGenerateClues}
              disabled={isGenerating || !content}
              className="h-8 text-xs px-4"
            />
          </div>
          
          {isGenerating ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ) : (
            <div>
               <p className="text-slate-500 text-xs mb-2">
                 AI generated keywords help others find this article even if they don't know the exact title. Edit as needed.
               </p>
               <textarea
                 className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 transition-colors"
                 rows={3}
                 value={aiClues}
                 onChange={(e) => setAiClues(e.target.value)}
                 placeholder="Clues will appear here..."
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
