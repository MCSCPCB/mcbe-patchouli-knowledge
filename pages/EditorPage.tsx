import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Page, KnowledgeItem } from '../types';
import { Button, IconButton, TextField, TextArea, Chip } from '../components/M3Components';
import { generateSearchClues } from '../services/geminiService';

const EditorPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const { items, setItems, currentUser } = useContext(AppContext);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [aiClues, setAiClues] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
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
      createdAt: new Date().toISOString()
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

        {/* Tag Input */}
        <div>
           <div className="flex gap-2 items-center mb-2 flex-wrap">
             {tags.map(tag => (
               <Chip key={tag} label={tag} onDelete={() => setTags(tags.filter(t => t !== tag))} />
             ))}
           </div>
           <div className="flex gap-2">
             <input 
               className="flex-1 h-10 px-3 bg-slate-100 rounded-lg outline-none text-sm border-b border-transparent focus:border-slate-500"
               placeholder="Add a tag..."
               value={newTag}
               onChange={(e) => setNewTag(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
             />
             <IconButton icon="add" onClick={handleAddTag} className="w-10 h-10 bg-slate-200" />
           </div>
        </div>

        <TextArea 
          label="Content (Markdown)" 
          value={content} 
          onChange={(e) => setContent(e.target.value)}
          placeholder="# Use headers for structure..."
          rows={12}
        />

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
