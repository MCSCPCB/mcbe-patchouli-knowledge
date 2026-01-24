import React, { useState } from 'react';
import { Page, KnowledgeType, Attachment } from '../types';
import { IconButton } from '../components/M3Components';
import { uploadFile, generateSearchClues, createPost } from '../services/knowledgeService';

const EditorPage: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<KnowledgeType>('script');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [aiClues, setAiClues] = useState('');
  
  // Loading States
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. 真实文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const url = await uploadFile(file);
        setAttachments(prev => [...prev, {
          id: Date.now().toString(),
          name: file.name,
          url: url,
          type: 'file'
        }]);
      } catch (error) {
        console.error(error);
        alert('Upload failed');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // 2. 真实 AI 线索生成
  const handleGenerateClues = async () => {
    if (!content.trim()) return;
    setIsGeneratingClues(true);
    try {
      const clues = await generateSearchClues(content);
      setAiClues(clues);
    } catch (error) {
      alert('AI generation failed');
    } finally {
      setIsGeneratingClues(false);
    }
  };

  // 3. 真实提交
  const handleSubmit = async () => {
    if (!title || !content || !aiClues) {
      alert('Please fill all fields and generate AI clues.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost({
        title,
        content,
        type,
        attachments,
        searchClues: aiClues
      });
      alert('Submission successful! Pending review.');
      onNavigate(Page.HOME);
    } catch (error) {
      console.error(error);
      alert('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between mb-8 border-b-4 border-[#1e1e1f] pb-4">
          <div className="flex items-center gap-4">
             <IconButton icon="arrow_back" onClick={() => onNavigate(Page.HOME)} />
             <h1 className="text-3xl font-bold font-mc text-white tracking-wide">NEW ENTRY</h1>
          </div>
          <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="px-6 py-3 bg-[#3C8527] border-2 border-white text-white font-mc shadow-[4px_4px_0_0_#000] hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
             {isSubmitting ? (
               <span className="material-symbols-rounded animate-spin">progress_activity</span>
             ) : (
               <span className="material-symbols-rounded">save</span>
             )}
             SUBMIT
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 flex flex-col gap-6">
             {/* Title */}
             <div className="group">
                <label className="block text-[#b0b0b0] font-mc text-xs mb-2 uppercase">Title</label>
                <input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#2b2b2b] border-2 border-[#5b5b5c] p-4 text-white font-bold text-lg outline-none focus:border-[#3C8527] focus:bg-[#000] transition-colors placeholder-[#5b5b5c]"
                  placeholder="Enter knowledge title..."
                />
             </div>

             {/* Content */}
             <div className="group flex-1 flex flex-col">
                <label className="block text-[#b0b0b0] font-mc text-xs mb-2 uppercase">Content (Markdown Supported)</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[400px] bg-[#2b2b2b] border-2 border-[#5b5b5c] p-4 text-[#e0e0e0] font-mono outline-none focus:border-[#3C8527] focus:bg-[#000] transition-colors resize-none leading-relaxed"
                  placeholder="Write your detailed content here..."
                />
             </div>

             {/* Attachments */}
             <div>
                <label className="block text-[#b0b0b0] font-mc text-xs mb-2 uppercase flex justify-between">
                   <span>Attachments</span>
                   {isUploading && <span className="text-[#3C8527] animate-pulse">UPLOADING...</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                   {attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-2 bg-[#1e1e1f] border border-[#5b5b5c] px-3 py-2">
                         <span className="material-symbols-rounded text-[#b0b0b0] text-sm">attachment</span>
                         <span className="text-white font-mono text-sm max-w-[150px] truncate">{att.name}</span>
                         <button 
                           onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                           className="hover:text-red-500"
                         >
                            <span className="material-symbols-rounded text-sm">close</span>
                         </button>
                      </div>
                   ))}
                   <label className="cursor-pointer bg-[#2b2b2b] border border-dashed border-[#5b5b5c] px-4 py-2 text-[#b0b0b0] font-mono text-sm hover:border-white hover:text-white transition-colors flex items-center gap-2">
                      <span className="material-symbols-rounded">add</span>
                      Add File
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                   </label>
                </div>
             </div>
          </div>

          {/* Right Column: Metadata & AI */}
          <div className="flex flex-col gap-6">
             {/* Type Selector */}
             <div className="bg-[#1e1e1f] border-2 border-[#5b5b5c] p-4">
                <label className="block text-[#b0b0b0] font-mc text-xs mb-3 uppercase">Category</label>
                <div className="flex flex-col gap-2">
                   {(['script', 'block', 'entity'] as KnowledgeType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`w-full py-3 px-4 text-left font-mc uppercase border-2 transition-all flex items-center justify-between ${
                           type === t 
                           ? 'bg-[#2b2b2b] border-white text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]' 
                           : 'border-transparent text-[#5b5b5c] hover:bg-[#2b2b2b] hover:text-[#b0b0b0]'
                        }`}
                      >
                        {t}
                        {type === t && <span className="material-symbols-rounded text-sm">check</span>}
                      </button>
                   ))}
                </div>
             </div>

             {/* AI Clues Generator */}
             <div className="bg-[#2b2b2b] border-2 border-[#b465f5] p-1 shadow-[4px_4px_0_0_#000]">
                <div className="bg-[#151515] p-4 border border-[#b465f5]/30">
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[#b465f5] font-mc text-sm flex items-center gap-2">
                         <span className="material-symbols-rounded">auto_awesome</span>
                         AI CLUES
                      </h3>
                      <button 
                        onClick={handleGenerateClues}
                        disabled={isGeneratingClues || !content}
                        className="text-[10px] font-bold bg-[#b465f5] text-black px-2 py-1 hover:bg-white transition-colors disabled:opacity-50"
                      >
                        {isGeneratingClues ? 'GENERATING...' : 'GENERATE'}
                      </button>
                   </div>
                   
                   <p className="text-[#5b5b5c] text-xs font-mono mb-3 leading-tight">
                      AI will analyze your content to generate search keywords.
                   </p>

                   <textarea 
                     value={aiClues}
                     onChange={(e) => setAiClues(e.target.value)}
                     className="w-full h-32 bg-[#000] border border-[#333] p-3 text-[#b465f5] font-mono text-xs outline-none focus:border-[#b465f5] resize-none placeholder-[#333]"
                     placeholder="Click GENERATE to start..."
                   />
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default EditorPage;
