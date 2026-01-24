import React, { useState } from 'react';
import { User, KnowledgeType, Attachment } from '../types';
import { generateSearchClues, createPost, uploadFile } from '../services/knowledgeService';

interface EditorPageProps {
  currentUser: User;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function EditorPage({ currentUser, onCancel, onSuccess }: EditorPageProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<KnowledgeType>('script');
  const [searchClues, setSearchClues] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Loading states
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. 生成 AI 线索
  const handleGenerateClues = async () => {
    if (!content) return;
    setIsGeneratingClues(true);
    try {
      const clues = await generateSearchClues(content);
      setSearchClues(clues);
    } catch (error) {
      alert('AI 生成失败，请稍后重试');
    } finally {
      setIsGeneratingClues(false);
    }
  };

  // 2. 上传文件
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
          type: file.name.split('.').pop() || 'file'
        }]);
      } catch (error) {
        console.error(error);
        alert('文件上传失败');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // 3. 提交表单
  const handleSubmit = async () => {
    if (!title || !content || !searchClues) {
      alert('请填写标题、内容并生成检索线索');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createPost({
        title,
        content,
        type,
        attachments,
        searchClues
      });
      alert('投稿成功！请等待管理员审核。');
      onSuccess();
    } catch (error) {
      console.error(error);
      alert('提交失败: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-20">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-black/5">
           <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h2 className="text-2xl font-normal text-[#191C1E]">新建知识</h2>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
         <label className="text-xs text-[#40484C] font-medium ml-1">标题</label>
         <input 
           className="w-full bg-[#EEF1F4] rounded-t-[4px] border-b border-[#70787D] px-4 py-3 outline-none focus:border-[#00668B] focus:bg-[#E6E8EB] transition-colors text-lg"
           placeholder="输入知识标题"
           value={title}
           onChange={(e) => setTitle(e.target.value)}
         />
      </div>

      {/* Type Chips */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-[#40484C] font-medium ml-1">类型标签</label>
        <div className="flex gap-2">
          {(['script', 'block', 'entity'] as KnowledgeType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                 type === t 
                 ? 'bg-[#001D32] text-white border-[#001D32]' 
                 : 'border-[#70787D] text-[#40484C]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
         <label className="text-xs text-[#40484C] font-medium ml-1">详细内容 (Markdown)</label>
         <textarea 
           className="w-full h-64 bg-[#EEF1F4] rounded-[12px] border border-transparent px-4 py-3 outline-none focus:border-[#00668B] transition-colors resize-none font-mono text-sm leading-relaxed"
           placeholder="在此输入正文..."
           value={content}
           onChange={(e) => setContent(e.target.value)}
         />
      </div>

      {/* Attachments */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center ml-1">
           <label className="text-xs text-[#40484C] font-medium">附件</label>
           {isUploading && <span className="text-xs text-[#00668B]">上传中...</span>}
        </div>
        <div className="flex flex-wrap gap-2">
           {attachments.map(att => (
             <div key={att.id} className="flex items-center gap-2 bg-[#E1E2E4] pl-3 pr-1 py-1 rounded-lg text-sm">
                <span className="truncate max-w-[150px]">{att.name}</span>
                <button 
                  onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                  className="p-1 rounded-full hover:bg-black/10"
                >
                  <span className="material-symbols-rounded text-base">close</span>
                </button>
             </div>
           ))}
           <label className="flex items-center gap-1 px-3 py-1.5 border border-[#70787D] rounded-lg text-sm font-medium text-[#40484C] cursor-pointer hover:bg-black/5">
              <span className="material-symbols-rounded text-base">upload_file</span>
              添加文件
              <input type="file" className="hidden" onChange={handleFileUpload} />
           </label>
        </div>
      </div>

      {/* AI Clue Generator */}
      <div className="p-4 rounded-[16px] bg-[#D0F8FF]/30 border border-[#D0F8FF] flex flex-col gap-3">
         <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-[#001E2C] flex items-center gap-1">
               <span className="material-symbols-rounded text-base text-[#00668B]">auto_awesome</span>
               检索线索 (AI)
            </h3>
            <button 
              onClick={handleGenerateClues}
              disabled={!content || isGeneratingClues}
              className="text-xs font-bold text-[#00668B] px-3 py-1 rounded-full hover:bg-[#D0F8FF] transition-colors disabled:opacity-50"
            >
              {isGeneratingClues ? '生成中...' : '✨ 生成/刷新'}
            </button>
         </div>
         
         <p className="text-xs text-[#40484C]">
           AI 将分析正文内容生成以下线索，用于增强搜索匹配度。你可以手动修改。
         </p>
         
         <textarea 
           className="w-full h-24 bg-[#FDFDFD] rounded-[8px] border border-[#70787D]/30 p-3 text-sm outline-none focus:border-[#00668B]"
           value={searchClues}
           onChange={(e) => setSearchClues(e.target.value)}
           placeholder="点击上方按钮自动生成..."
         />
      </div>

      {/* Submit */}
      <div className="flex gap-4 mt-4">
         <button 
           onClick={onCancel}
           className="flex-1 h-12 rounded-full border border-[#70787D] text-[#001D32] font-medium hover:bg-black/5"
         >
           取消
         </button>
         <button 
           onClick={handleSubmit}
           disabled={isSubmitting}
           className="flex-1 h-12 rounded-full bg-[#00668B] text-white font-medium shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-70"
         >
           {isSubmitting ? '提交中...' : '提交审核'}
         </button>
      </div>
    </div>
  );
}
