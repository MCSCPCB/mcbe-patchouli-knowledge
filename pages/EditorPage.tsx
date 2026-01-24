import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Page, KnowledgeItem, PREDEFINED_TAGS, Attachment } from '../types';
import { Button, IconButton, TextField, Select, Chip, RichMarkdownEditor } from '../components/M3Components';
import { generateSearchClues } from '../services/knowledgeService';

const EditorPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const { items, setItems, currentUser } = useContext(AppContext);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [aiClues, setAiClues] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleTagChange = (tag: string) => {
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
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6 bg-[#313233] p-2 border-b-2 border-[#1e1e1f] sticky top-16 z-20">
        <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} />
        <h2 className="text-xl font-bold font-mc text-white uppercase">New Entry</h2>
        <Button label="Save" onClick={handleSubmit} variant="success" disabled={!title || !content} />
      </div>

      <div className="space-y-6">
        <TextField 
          label="Title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="e.g., Diamond Mining Logic"
        />

        {/* Tag Selection */}
        <div className="bg-[#313233] p-4 border-2 border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f]">
           <div className="mb-4">
             <Select 
                label="Category Tag"
                options={PREDEFINED_TAGS}
                value=""
                onChange={handleTagChange}
                placeholder="Add Tag..."
             />
           </div>
           
           <div className="flex flex-wrap gap-2">
             {tags.map(tag => (
               <Chip key={tag} label={tag} onDelete={() => setTags(tags.filter(t => t !== tag))} selected />
             ))}
             {tags.length === 0 && <span className="text-sm font-mc text-[#707070]">No tags selected</span>}
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
            <div className="bg-[#1e1e1f] border-2 border-[#5b5b5c] p-4">
                <h4 className="text-xs font-bold font-mc uppercase text-[#b0b0b0] mb-3">Attachments ({attachments.length})</h4>
                <div className="space-y-2">
                    {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-3 bg-[#313233] p-2 border border-[#000]">
                            <span className="material-symbols-rounded text-[#b0b0b0]">attachment</span>
                            <span className="text-sm font-mono text-white flex-1 truncate">{att.name}</span>
                            <IconButton 
                                icon="delete" 
                                className="w-8 h-8 !bg-[#8B0000] !border-[#B22222]" 
                                onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* AI Clue Generator Section */}
        <div className="p-4 bg-[#2b2b2b] border-2 border-[#b465f5]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#b465f5]">
               <span className="material-symbols-rounded">auto_awesome</span>
               <h3 className="font-bold font-mc text-sm uppercase tracking-wide">AI Keywords</h3>
            </div>
            <Button 
              variant="tonal" 
              label={isGenerating ? "..." : "Generate"} 
              icon={!isGenerating ? "refresh" : undefined}
              onClick={handleGenerateClues}
              disabled={isGenerating || !content}
              className="h-8 text-xs px-4"
            />
          </div>
          
          <div className="bg-[#1e1e1f] border-2 border-t-[#000] border-l-[#000] border-b-[#5b5b5c] border-r-[#5b5b5c] p-2">
               <textarea
                 className="w-full bg-transparent outline-none text-[#e0e0e0] font-mono text-sm"
                 rows={3}
                 value={aiClues}
                 onChange={(e) => setAiClues(e.target.value)}
                 placeholder="Clues will appear here..."
               />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
