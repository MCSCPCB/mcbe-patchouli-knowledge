import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { Page, PREDEFINED_TAGS, Attachment } from '../types';
import { Button, IconButton, TextField, Select, Chip, RichMarkdownEditor } from '../components/M3Components';
import { generateSearchClues, createPost, updatePost, getRecentPosts, uploadFile } from '../services/knowledgeService';

const EditorPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const { items, setItems, currentUser, selectedItemId, refreshData } = useContext(AppContext);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [aiClues, setAiClues] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const initializedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedItemId && items.length > 0 && initializedIdRef.current !== selectedItemId) {
      const existingItem = items.find(i => i.id === selectedItemId);
      if (existingItem) {
        setTitle(existingItem.title);
        setContent(existingItem.content);
        setTags(existingItem.tags);
        setAiClues(existingItem.aiClues || '');
        setAttachments(existingItem.attachments || []);
        initializedIdRef.current = selectedItemId;
      }
    }
  }, [selectedItemId, items]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'file'>('file');

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

  const handleTriggerUpload = (type: 'image' | 'video' | 'file') => {
      setUploadType(type);
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          const url = await uploadFile(file);
          if (uploadType === 'image') {
              setContent(prev => prev + `\n![${file.name}](${url})\n`);
          } else if (uploadType === 'video') {
              setContent(prev => prev + `\n<video src="${url}" controls class="w-full rounded-xl my-2"></video>\n`);
          } else {
              setAttachments(prev => [...prev, {
                  id: Date.now().toString(),
                  name: file.name,
                  type: 'file',
                  url: url
              }]);
          }
      } catch (error) {
          alert("Upload failed: " + error);
      } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSubmit = async () => {
    if (!title || !content || !currentUser) return;
    setIsSaving(true);
    
    try {
        const payload = { title, content, tags, aiClues, attachments };
        if (selectedItemId) {
            await updatePost(selectedItemId, payload);
        } else {
            await createPost(payload);
        }

        const posts = await getRecentPosts();
        setItems(posts);
        await refreshData();
        onNavigate(Page.HOME);
    } catch (e) {
        alert("Failed to save: " + e);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 animate-[fadeIn_0.3s_ease-out]">
      {/* Top App Bar */}
      <div className="flex items-center justify-between mb-8 sticky top-4 z-40 bg-[#121212]/80 backdrop-blur-xl rounded-full px-4 py-2 border border-[#2C2C2C] shadow-xl">
        <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} className="!w-10 !h-10" />
        <span className="text-sm font-medium text-[#C7C7CC] uppercase tracking-wider">
            {selectedItemId ? 'Edit Manuscript' : 'New Entry'}
        </span>
        <Button 
            label={isSaving ? "Saving..." : "Save"} 
            onClick={handleSubmit} 
            disabled={!title || !content || isSaving}
            className={`!h-9 !rounded-full !px-6 ${isSaving ? 'opacity-50' : ''}`}
        />
      </div>

      <div className="space-y-8">
        {/* Title Input */}
        <div className="space-y-1">
             <TextField 
                label="Title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ex: Diamond Mining Logic"
                className="!bg-transparent !border-0 !border-b !border-[#444] !text-3xl !h-auto !px-0 !pb-2 focus-within:!border-[#7DA3A1] !rounded-none"
             />
        </div>

        {/* Tag Selection */}
        <div className="space-y-3">
           <label className="text-xs text-[#8C918C] ml-1 uppercase tracking-wide">Classification</label>
           <div className="flex flex-wrap gap-2 items-center min-h-[48px]">
             {tags.map(tag => (
               <Chip key={tag} label={tag} onDelete={() => setTags(tags.filter(t => t !== tag))} selected />
             ))}
             <div className="relative">
                <Select 
                    label=""
                    options={PREDEFINED_TAGS}
                    value=""
                    onChange={handleTagChange}
                    placeholder="+ Add Tag"
                    className="w-32 !mb-0"
                />
             </div>
           </div>
        </div>

        {/* Editor */}
        <RichMarkdownEditor 
          label="Content" 
          value={content} 
          onChange={setContent}
          onAddAttachment={() => handleTriggerUpload('file')}
          onUploadImage={() => handleTriggerUpload('image')}
          onUploadVideo={() => handleTriggerUpload('video')}
        />

        {/* Attachments List */}
        {attachments.length > 0 && (
            <div className="bg-[#1E1E1E] rounded-2xl border border-[#2C2C2C] overflow-hidden">
                <div className="px-4 py-3 bg-[#252529] border-b border-[#2C2C2C] flex items-center gap-2">
                    <span className="material-symbols-rounded text-[#7DA3A1] text-sm">attachment</span>
                    <span className="text-xs font-bold text-[#8C918C] uppercase tracking-wider">Attachments ({attachments.length})</span>
                </div>
                <div className="divide-y divide-[#2C2C2C]">
                    {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-4 p-3 hover:bg-[#2C2C2C] transition-colors group">
                            <div className="w-8 h-8 rounded bg-[#333] flex items-center justify-center text-[#E6E6E6]">
                                <span className="material-symbols-rounded text-lg">description</span>
                            </div>
                            <span className="text-sm text-[#E6E6E6] flex-1 truncate">{att.name}</span>
                            <button 
                                onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[#CF6679] hover:bg-[#CF6679]/10 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <span className="material-symbols-rounded text-lg">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* AI Insight Generator */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#D0BCFF]/5 border border-[#D0BCFF]/10 p-6 transition-all hover:border-[#D0BCFF]/30">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <span className="material-symbols-rounded text-[120px] text-[#D0BCFF]">auto_awesome</span>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#D0BCFF]">
                    <span className="material-symbols-rounded">auto_awesome</span>
                    <h3 className="font-medium text-sm">AI Enhancement</h3>
                </div>
                <Button 
                    variant="tonal" 
                    label={isGenerating ? "Analyzing..." : "Generate Insights"} 
                    icon={!isGenerating ? "refresh" : undefined}
                    onClick={handleGenerateClues}
                    disabled={isGenerating || !content}
                    className="!h-8 !text-xs !bg-[#D0BCFF]/10 !text-[#D0BCFF] hover:!bg-[#D0BCFF]/20"
                />
            </div>
            
            <textarea
                className="w-full bg-[#121212]/50 rounded-xl border border-[#D0BCFF]/20 p-4 text-[#E6E1E5] text-sm leading-relaxed outline-none focus:border-[#D0BCFF]/50 transition-colors resize-none placeholder-[#D0BCFF]/30"
                rows={3}
                value={aiClues}
                onChange={(e) => setAiClues(e.target.value)}
                placeholder="AI generated context and search clues will appear here..."
            />
          </div>
        </div>
      </div>
      
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default EditorPage;
