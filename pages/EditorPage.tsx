import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { Page, PREDEFINED_TAGS, Attachment } from '../types';
import { Button, IconButton, TextField, Select, Chip, RichMarkdownEditor, Dialog } from '../components/M3Components';
import { generateSearchClues, createPost, updatePost, getRecentPosts, uploadFile, uploadImage } from '../services/knowledgeService';

const EditorPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const { items, setItems, currentUser, selectedItemId, refreshData } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [aiClues, setAiClues] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // === 修改点 3: 统一弹窗状态管理 ===
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [errorDialog, setErrorDialog] = useState<{ open: boolean, message: string }>({ open: false, message: '' });

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

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleTagChange = (tag: string) => {
    if (!tags.includes(tag)) {
        setTags([...tags, tag]);
    }
  };

  const handleError = (msg: string) => {
      setErrorDialog({ open: true, message: msg });
  };

  const handleGenerateClues = async () => {
    if (!content) return;
    setIsGenerating(true);
    try {
      const clues = await generateSearchClues(content);
      setAiClues(clues);
    } catch (e) {
      handleError("AI Service Unavailable");
    } finally {
      setIsGenerating(false);
    }
  };
  // 点击插入视频按钮，打开弹窗
  const handleTriggerVideo = () => {
      setVideoUrlInput('');
      setVideoDialogOpen(true);
  };
  // 确认插入视频
  const handleConfirmVideoInsert = () => {
      const url = videoUrlInput.trim();
      if (!url) {
          setVideoDialogOpen(false);
          return;
      }

      let insertCode = '';
      if (url.includes('b23.tv')) {
        handleError("请提供完整的 Bilibili 视频链接（以 www.bilibili.com/video/BV... 开头）以确保最佳兼容性");
        return;
      }

      const bvidMatch = url.match(/BV[a-zA-Z0-9]+/);
      if (url.includes('bilibili.com') && bvidMatch) {
        const bvid = bvidMatch[0];
        insertCode = `\n<iframe src="//player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" class="w-full aspect-video rounded-xl my-2"></iframe>\n`;
      } 
      else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
        else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1];
        if (videoId) {
            insertCode = `\n<iframe src="https://www.youtube.com/embed/${videoId}" class="w-full aspect-video rounded-xl my-2" frameborder="0" allowfullscreen></iframe>\n`;
        }
      }
      else {
        insertCode = `\n<video src="${url}" controls class="w-full rounded-xl my-2"></video>\n`;
      }

      if (insertCode) {
        setContent(prev => prev + insertCode);
      }
      setVideoDialogOpen(false);
  };

  const handleTriggerUpload = (type: 'image' | 'video' | 'file') => {
      if (type === 'video') {
        handleTriggerVideo();
        return;
      }

      if (type === 'image' && imageInputRef.current) {
          imageInputRef.current.value = '';
          imageInputRef.current.click();
      } else if (type === 'file' && fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        if (type === 'image') {
            const url = await uploadImage(file);
            // 关键修复：在这里对上传后的 URL 进行加速包装（移除了 w=800 限制）
            const optimizedUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&q=80`;
            setContent(prev => prev + `\n![${file.name}](${optimizedUrl})\n`);
        } else {
            const url = await uploadFile(file);
            setAttachments(prev => [...prev, {
                id: Date.now().toString(),
                name: file.name,
                type: 'file',
                url: url
            }]);
        }
    } catch (error: any) {
        handleError("Upload failed: " + error.message);
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
    } catch (e: any) {
        handleError("Failed to save: " + e.message || e);
    } finally {
        setIsSaving(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 animate-[fadeIn_0.3s_ease-out]">
      {/* Top App Bar */}
      {/* 修复：将 top-4 改为 top-20，避免与顶栏重叠 */}
      <div className="flex items-center justify-between mb-8 sticky top-20 z-40 bg-[#121212]/80 backdrop-blur-xl rounded-full px-4 py-2 border border-[#2C2C2C] shadow-xl">
        <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} className="!w-10 !h-10" />
        <span className="text-sm font-medium text-[#C7C7CC] uppercase tracking-wider">
            {selectedItemId ? '修改知识' : '创建新知识'}
        </span>
      
        <Button 
            label={isSaving ? "正在保存..." : "保存"} 
            onClick={handleSubmit} 
            disabled={!title || !content || isSaving}
            className={`!h-9 !rounded-full !px-6 ${isSaving ? 'opacity-50' : ''}`}
        />
      </div>

      <div className="space-y-8">
        {/* Title Input */}
        <div className="space-y-1">
             <TextField 
                label="标题" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ex: Diamond Mining Logic"
                className="!bg-transparent !border-0 !border-b !border-[#444] !text-3xl !h-auto !px-0 !pb-2 focus-within:!border-[#7DA3A1] !rounded-none"
             />
        </div>

        {/* Tag Selection */}
        <div className="space-y-3">
           <label className="text-xs text-[#8C918C] ml-1 uppercase tracking-wide">分类</label>
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
                    placeholder="+ 添加标签"
                    className="w-32 !mb-0"
                />
             </div>
           </div>
        </div>

        {/* Editor */}
        <RichMarkdownEditor 
          label="内容" 
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
                    <span className="text-xs font-bold text-[#8C918C] uppercase tracking-wider">附件 ({attachments.length})</span>
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
                    <h3 className="font-medium text-sm">检索线索</h3>
                </div>
                <Button 
                    variant="tonal" 
                    label={isGenerating ? "少女祈祷中..." : "帮我想想！"} 
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
                placeholder="描述该知识可能会用于什么场景，可以帮助AI更容易找到这个芝士哦！"
            />
          </div>
       
         </div>
      </div>
      
      {/* 独立的 Inputs */}
      <input 
        type="file" 
        ref={imageInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, 'image')}
        accept="image/*"
      />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={(e) => handleFileChange(e, 'file')} 
        accept=".txt,.json,.md,.csv,.py,.js,.ts,.html,.css,.sql,.log,.xml,.yml,.yaml"
      />

      {/* Insert Video Dialog */}
      <Dialog
        open={videoDialogOpen}
        title="插入视频"
        onClose={() => setVideoDialogOpen(false)}
        actions={
            <>
              <Button variant="text" label="取消" onClick={() => setVideoDialogOpen(false)} />
              <Button variant="filled" label="插入" onClick={handleConfirmVideoInsert} />
            </>
        }
      >
        <div className="pt-2 pb-4">
            <p className="text-[#C7C7CC] text-sm mb-4">支持：Bilibili、YouTube 或 .mp4 链接</p>
            <TextField 
                label="视频 URL" 
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://..."
            />
      
         </div>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        open={errorDialog.open}
        title="注意"
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        actions={
            <Button variant="text" label="OK" onClick={() => setErrorDialog({ ...errorDialog, open: false })} />
        }
      >
         <p className="text-[#E6E6E6]">{errorDialog.message}</p>
      </Dialog>
    </div>
  );
};
export default EditorPage;
