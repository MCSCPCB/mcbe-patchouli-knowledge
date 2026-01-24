import React, { useState, useEffect, useRef } from 'react';

// Note: OreUI doesn't really use ripples, but we keep the file structure. 
// We will replace the "Ripple" with a sound effect hook or visual press state in the button CSS.
export const Ripple: React.FC = () => null; 

// --- Buttons ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated' | 'success';
  icon?: string;
  label: string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'filled', icon, label, className = '', fullWidth, ...props }) => {
  // OreUI Style Buttons
  const base = "relative h-10 px-4 font-mc text-xl uppercase tracking-wide flex items-center justify-center gap-2 transition-none border-2 active:bg-[#3a3b3c] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1e1e1f]";
  
  // Using box-shadows and borders to create the MC 3D effect
  const oreStyle = "bg-[#48494a] text-[#e0e0e0] border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f] active:border-t-[#1e1e1f] active:border-l-[#1e1e1f] active:border-b-[#5b5b5c] active:border-r-[#5b5b5c]";
  const greenStyle = "bg-[#3C8527] text-white border-t-[#52A535] border-l-[#52A535] border-b-[#1A3B12] border-r-[#1A3B12] active:bg-[#2E6B1E] active:border-t-[#1A3B12] active:border-l-[#1A3B12] active:border-b-[#52A535] active:border-r-[#52A535]";
  const dangerStyle = "bg-[#8B0000] text-white border-t-[#B22222] border-l-[#B22222] border-b-[#500000] border-r-[#500000]";

  let variantClass = oreStyle;
  if (variant === 'filled' && className.includes('bg-red')) variantClass = dangerStyle;
  if (variant === 'success') variantClass = greenStyle;
  if (variant === 'text') variantClass = "bg-transparent text-[#e0e0e0] hover:bg-[#48494a] border-transparent";

  return (
    <button className={`${base} ${variantClass} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
      {icon && <span className="material-symbols-rounded text-[20px]">{icon}</span>}
      <span className="relative drop-shadow-md">{label}</span>
    </button>
  );
};

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; active?: boolean }> = ({ icon, className = '', active, ...props }) => (
  <button 
    className={`
      w-10 h-10 flex items-center justify-center border-2 
      ${active 
        ? 'bg-[#3C8527] border-t-[#1A3B12] border-l-[#1A3B12] border-b-[#52A535] border-r-[#52A535] text-white' 
        : 'bg-[#48494a] border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f] text-[#b0b0b0] hover:text-white active:border-t-[#1e1e1f] active:border-l-[#1e1e1f] active:border-b-[#5b5b5c] active:border-r-[#5b5b5c]'
      }
      ${className}
    `}
    {...props}
  >
    <span className="material-symbols-rounded">{icon}</span>
  </button>
);

export const FAB: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; extended?: boolean; label?: string }> = ({ icon, extended, label, className = '', ...props }) => (
  <button 
    className={`fixed bottom-6 right-6 z-50 bg-[#3C8527] text-white shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2 border-2 border-[#52A535]
    ${extended ? 'h-14 px-5' : 'w-14 h-14'} ${className}`}
    {...props}
  >
    <span className="material-symbols-rounded text-[28px]">{icon}</span>
    {extended && <span className="font-mc text-lg">{label}</span>}
  </button>
);

// --- Inputs ---
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({ label, error, className = '', value, ...props }) => {
  return (
    <div className={`relative ${className}`}>
      <label className="block text-[#b0b0b0] font-mc text-sm mb-1 uppercase tracking-wide">
        {label}
      </label>
      <div className={`bg-[#1e1e1f] border-2 ${error ? 'border-[#ff5555]' : 'border-[#5b5b5c] border-t-[#000] border-l-[#000] border-b-[#5b5b5c] border-r-[#5b5b5c]'} p-1`}>
        <input
          className="w-full h-10 px-2 bg-transparent outline-none text-white font-mono placeholder:text-[#58585a]"
          value={value}
          {...props}
        />
      </div>
    </div>
  );
};

// --- Select / Dropdown ---
interface SelectProps {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, value, onChange, placeholder, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = Array.isArray(value) ? (value.length > 0 ? value.join(', ') : '') : value;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label className="block text-[#b0b0b0] font-mc text-sm mb-1 uppercase tracking-wide">{label}</label>
      <div 
        className={`bg-[#48494a] h-12 border-2 border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f] px-3 flex items-center justify-between cursor-pointer active:bg-[#3a3b3c]`}
        onClick={() => setIsOpen(!isOpen)}
      >
         <span className="text-white font-mc text-lg truncate">{displayValue || <span className="text-gray-500">{placeholder || 'Select'}</span>}</span>
         <span className="material-symbols-rounded text-white">expand_more</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1e1e1f] border-2 border-[#5b5b5c] max-h-60 overflow-y-auto shadow-xl">
           {options.map((opt) => (
             <div 
               key={opt}
               onClick={() => { onChange(opt); setIsOpen(false); }}
               className={`px-4 py-2 hover:bg-[#3a3b3c] cursor-pointer flex items-center justify-between font-mc text-lg border-b border-[#313233] last:border-0
                 ${(Array.isArray(value) ? value.includes(opt) : value === opt) ? 'text-[#52A535]' : 'text-[#e0e0e0]'}
               `}
             >
               {opt}
               {(Array.isArray(value) ? value.includes(opt) : value === opt) && <span className="material-symbols-rounded text-[18px]">check</span>}
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

// --- Rich Text Editor ---
interface RichEditorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onAddAttachment: () => void;
  onUploadImage?: () => void;
}

export const RichMarkdownEditor: React.FC<RichEditorProps> = ({ label, value, onChange, onAddAttachment }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = value.substring(start, end);
    const newText = value.substring(0, start) + prefix + text + suffix + value.substring(end);
    onChange(newText);
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
        }
    }, 0);
  };

  const handleMedia = (type: 'image' | 'video') => {
    const url = prompt(`Enter ${type} URL:`);
    if (!url) return;
    if (type === 'image') insertText(`![Image](${url})`);
    if (type === 'video') insertText(`<video controls src="${url}" class="w-full border-2 border-[#1e1e1f] my-2"></video>\n`);
  };

  return (
    <div className="flex flex-col">
       <label className="block text-[#b0b0b0] font-mc text-sm mb-1 uppercase tracking-wide">{label}</label>
       <div className="bg-[#1e1e1f] border-2 border-t-[#000] border-l-[#000] border-b-[#5b5b5c] border-r-[#5b5b5c] flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b-2 border-[#313233] bg-[#313233] overflow-x-auto no-scrollbar">
             <IconButton icon="format_bold" className="w-8 h-8 scale-90" onClick={() => insertText('**', '**')} title="Bold" />
             <IconButton icon="format_italic" className="w-8 h-8 scale-90" onClick={() => insertText('*', '*')} title="Italic" />
             <IconButton icon="format_underlined" className="w-8 h-8 scale-90" onClick={() => insertText('<u>', '</u>')} title="Underline" />
             <IconButton icon="strikethrough_s" className="w-8 h-8 scale-90" onClick={() => insertText('~~', '~~')} title="Strikethrough" />
             <div className="w-[2px] h-6 bg-[#5b5b5c] mx-1"></div>
             <IconButton icon="code" className="w-8 h-8 scale-90" onClick={() => insertText('`', '`')} title="Inline Code" />
             <IconButton icon="data_object" className="w-8 h-8 scale-90" onClick={() => insertText('\n```\n', '\n```\n')} title="Code Block" />
             <div className="w-[2px] h-6 bg-[#5b5b5c] mx-1"></div>
             <IconButton icon="image" className="w-8 h-8 scale-90" onClick={() => {
             if (onUploadImage) {
                    onUploadImage(); // 如果传了上传回调，就用回调
                 } else {
                    handleMedia('image'); // 否则还是用原来的 URL 弹窗
                 }
             }} title="Insert Image" />
             <IconButton icon="movie" className="w-8 h-8 scale-90" onClick={() => handleMedia('video')} title="Insert Video" />
             <div className="flex-1"></div>
             <div className="w-[2px] h-6 bg-[#5b5b5c] mx-1"></div>
             <IconButton icon="attach_file" className="w-8 h-8 scale-90 !text-[#52A535]" onClick={onAddAttachment} title="Add Attachment" />
          </div>

          <textarea 
            ref={textareaRef}
            className="w-full bg-[#1e1e1f] outline-none text-[#e0e0e0] resize-none min-h-[300px] font-mono p-4"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write knowledge..."
          />
       </div>
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className = '', value, ...props }) => (
   <div className={`flex flex-col ${className}`}>
      <label className="block text-[#b0b0b0] font-mc text-sm mb-1 uppercase tracking-wide">{label}</label>
      <div className="bg-[#1e1e1f] border-2 border-t-[#000] border-l-[#000] border-b-[#5b5b5c] border-r-[#5b5b5c] p-2">
        <textarea 
          className="w-full bg-transparent outline-none text-white font-mono resize-none"
          value={value}
          {...props}
        />
      </div>
   </div>
);

// --- Chips ---
export const Chip: React.FC<{ label: string; selected?: boolean; onClick?: () => void; onDelete?: () => void; icon?: string }> = ({ label, selected, onClick, onDelete, icon }) => (
  <div 
    onClick={onClick}
    className={`
      relative inline-flex items-center gap-2 h-8 px-3 font-mc text-lg cursor-pointer select-none border-2
      ${selected 
        ? 'bg-[#3C8527] border-t-[#52A535] border-l-[#52A535] border-b-[#1A3B12] border-r-[#1A3B12] text-white' 
        : 'bg-[#48494a] border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f] text-[#b0b0b0] hover:text-white'
      }
    `}
  >
    {selected && <span className="material-symbols-rounded text-[18px]">check</span>}
    {!selected && icon && <span className="material-symbols-rounded text-[18px]">{icon}</span>}
    <span className="translate-y-[1px]">{label}</span>
    {onDelete && (
      <span 
        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
        className="material-symbols-rounded text-[16px] ml-1 hover:text-red-400"
      >
        close
      </span>
    )}
  </div>
);

// --- Switch ---
export const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center gap-4 cursor-pointer" onClick={() => onChange(!checked)}>
    <div className={`w-[50px] h-[26px] border-2 border-[#1e1e1f] relative transition-colors ${checked ? 'bg-[#313233]' : 'bg-[#313233]'}`}>
      <div className={`absolute top-[-2px] bottom-[-2px] w-6 bg-[#b0b0b0] border-2 border-white transition-all ${checked ? 'right-[-2px] bg-[#3C8527] border-[#52A535]' : 'left-[-2px]'}`}></div>
    </div>
    {label && <span className="text-xl font-mc text-white">{label}</span>}
  </div>
);

// --- Dialog ---
export const Dialog: React.FC<{ open: boolean; title: string; children: React.ReactNode; onClose: () => void; actions?: React.ReactNode }> = ({ open, title, children, onClose, actions }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-grayscale" onClick={onClose} />
      <div className="relative bg-[#313233] border-4 border-[#1e1e1f] shadow-[8px_8px_0_0_#000] w-full max-w-md p-0 flex flex-col">
        {/* Header */}
        <div className="bg-[#48494a] px-4 py-2 border-b-2 border-[#1e1e1f] flex justify-between items-center">
            <h4 className="text-xl font-mc text-[#e0e0e0]">{title}</h4>
        </div>
        
        {/* Content */}
        <div className="p-6 text-[#b0b0b0]">
          {children}
        </div>

        {/* Actions */}
        <div className="p-4 border-t-2 border-[#1e1e1f] bg-[#2b2b2b] flex justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
};

// --- Avatar ---
export const Avatar: React.FC<{ src?: string; name: string; size?: 'sm' | 'md' | 'lg'; onClick?: () => void }> = ({ src, name, size = 'md', onClick }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-base' };
  return (
    <div onClick={onClick} className={`${sizes[size]} border-2 border-white bg-[#5b5b5c] text-white flex items-center justify-center font-bold overflow-hidden cursor-pointer hover:brightness-110`}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover rendering-pixelated" style={{imageRendering: 'pixelated'}} /> : name.charAt(0)}
    </div>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; variant?: 'elevated' | 'filled' | 'outlined'; onClick?: () => void; className?: string }> = ({ children, variant, onClick, className = '' }) => {
  // All cards look like panels in OreUI
  return (
    <div 
        onClick={onClick} 
        className={`bg-[#313233] border-2 border-t-[#5b5b5c] border-l-[#5b5b5c] border-b-[#1e1e1f] border-r-[#1e1e1f] p-4 cursor-pointer hover:bg-[#3a3b3c] transition-colors ${className}`}
    >
      {children}
    </div>
  );
};
