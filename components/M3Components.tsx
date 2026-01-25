import React, { useState, useEffect, useRef } from 'react';

// --- Utils ---
// 真正的涟漪效果在这个重构中用 CSS active 状态和 scale 模拟，保持轻量
export const Ripple: React.FC = () => null; 

// --- Buttons ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated' | 'success';
  icon?: string;
  label: string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'filled', icon, label, className = '', fullWidth, ...props }) => {
  // MD3 Base: Rounded-full (Capsule), Height 40px, Ripple hidden overflow
  const base = "relative h-10 px-6 font-medium text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] rounded-full active:scale-95 disabled:opacity-50 disabled:active:scale-100 overflow-hidden";
  
  // Color Mapping (Traditional Dark Theme)
  // 青磁 (Seiji) as Primary
  const filledStyle = "bg-[#7DA3A1] text-[#0D1F1E] shadow-sm hover:shadow-md hover:brightness-105 active:shadow-none";
  const tonalStyle = "bg-[#2D3635] text-[#A5C9C7] hover:bg-[#364240]";
  const outlinedStyle = "bg-transparent border border-[#8C918C] text-[#E0E2E0] hover:bg-[#E0E2E0]/10";
  const textStyle = "bg-transparent text-[#7DA3A1] hover:bg-[#7DA3A1]/10 px-3";
  const elevatedStyle = "bg-[#2B2B2B] text-[#E6E6E6] shadow-[0_4px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.4)]";
  
  // Specific States
  const dangerStyle = "bg-[#CF6679] text-[#37000B] hover:brightness-110"; // 茜色 (Akane) variation
  const successStyle = "bg-[#8FBC8F] text-[#0A260A] hover:brightness-105"; // 柳染 (Yanagizome)

  let variantClass = filledStyle;
  if (variant === 'tonal') variantClass = tonalStyle;
  if (variant === 'outlined') variantClass = outlinedStyle;
  if (variant === 'text') variantClass = textStyle;
  if (variant === 'elevated') variantClass = elevatedStyle;
  if (variant === 'filled' && className.includes('bg-red')) variantClass = dangerStyle; // Backward compat hook
  if (variant === 'success') variantClass = successStyle;

  return (
    <button className={`${base} ${variantClass} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
      {icon && <span className="material-symbols-rounded text-[18px]">{icon}</span>}
      <span className="relative z-10">{label}</span>
    </button>
  );
};

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; active?: boolean }> = ({ icon, className = '', active, ...props }) => (
  <button 
    className={`
      w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out active:scale-90
      ${active 
        ? 'bg-[#2D3635] text-[#7DA3A1] shadow-inner' 
        : 'text-[#C7C7CC] hover:bg-[#E6E6E6]/10 hover:text-white'
      }
      ${className}
    `}
    {...props}
  >
    <span className="material-symbols-rounded text-[24px]">{icon}</span>
  </button>
);

export const FAB: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; extended?: boolean; label?: string }> = ({ icon, extended, label, className = '', ...props }) => (
  <button 
    className={`fixed bottom-6 right-6 z-50 bg-[#B3C2B3] text-[#1A2C1D] shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] flex items-center justify-center gap-3
    ${extended ? 'h-14 px-6 rounded-[16px]' : 'w-14 h-14 rounded-[16px]'} ${className}`}
    {...props}
  >
    <span className="material-symbols-rounded text-[24px]">{icon}</span>
    {extended && <span className="font-medium text-[16px] tracking-wide">{label}</span>}
  </button>
);

// --- Inputs ---
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({ label, error, className = '', value, ...props }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.toString().length > 0;

  return (
    <div className={`relative bg-[#2C2C2C] rounded-t-lg rounded-b-none border-b border-[#8C918C] hover:bg-[#343434] transition-colors ${className}`}>
      <label 
        className={`absolute left-4 transition-all duration-200 pointer-events-none text-[#C7C7CC]
          ${(focused || hasValue) ? 'top-2 text-xs text-[#7DA3A1]' : 'top-4 text-base'}
        `}
      >
        {label}
      </label>
      <input
        className="w-full h-14 pt-5 pb-1 px-4 bg-transparent outline-none text-[#E6E6E6] font-sans placeholder-transparent caret-[#7DA3A1]"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {/* Active Indicator */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-[#7DA3A1] transition-transform duration-300 origin-center ${focused ? 'scale-x-100' : 'scale-x-0'}`} />
      {error && <div className="absolute right-3 top-4 text-[#CF6679] material-symbols-rounded text-xl">error</div>}
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
      <div 
        className={`bg-[#2C2C2C] border border-[#444] rounded-lg h-12 px-4 flex items-center justify-between cursor-pointer hover:border-[#7DA3A1] transition-colors`}
        onClick={() => setIsOpen(!isOpen)}
      >
         <div className="flex flex-col justify-center">
            {displayValue ? (
                <>
                    <span className="text-[10px] text-[#A0A0A0] leading-none mb-0.5">{label}</span>
                    <span className="text-[#E6E6E6] text-sm truncate">{displayValue}</span>
                </>
            ) : (
                <span className="text-[#A0A0A0] text-sm">{placeholder || label}</span>
            )}
         </div>
         <span className={`material-symbols-rounded text-[#C7C7CC] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>arrow_drop_down</span>
      </div>

      <div className={`
          absolute top-full left-0 right-0 z-50 mt-1 bg-[#2C2C2C] rounded-xl overflow-hidden shadow-2xl origin-top transition-all duration-200
          ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}
      `}>
         <div className="max-h-60 overflow-y-auto py-2">
            {options.map((opt) => {
                const isSelected = Array.isArray(value) ? value.includes(opt) : value === opt;
                return (
                    <div 
                    key={opt}
                    onClick={() => { onChange(opt); setIsOpen(false); }}
                    className={`px-4 py-3 cursor-pointer flex items-center justify-between text-sm hover:bg-[#7DA3A1]/10 transition-colors
                        ${isSelected ? 'text-[#7DA3A1] bg-[#7DA3A1]/5 font-medium' : 'text-[#E6E6E6]'}
                    `}
                    >
                    {opt}
                    {isSelected && <span className="material-symbols-rounded text-[18px]">check</span>}
                    </div>
                );
            })}
         </div>
      </div>
    </div>
  );
};

// --- Rich Text Editor ---
// Simplified styling for M3
interface RichEditorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onAddAttachment: () => void;
  onUploadImage?: () => void;
  onUploadVideo?: () => void;
}

export const RichMarkdownEditor: React.FC<RichEditorProps> = ({ label, value, onChange, onAddAttachment, onUploadImage, onUploadVideo }) => {
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
      if (type === 'image') {
         const optimizedUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&q=80`;
         insertText(`![Image](${optimizedUrl})`);
      }

      if (type === 'video') insertText(`<video controls src="${url}" class="w-full rounded-xl my-2"></video>\n`);
    };
  
    return (
      <div className="flex flex-col group">
         <label className="block text-[#A0A0A0] text-sm mb-2 ml-1">{label}</label>
         <div className="bg-[#1E1E1E] rounded-2xl border border-[#444] overflow-hidden focus-within:border-[#7DA3A1] transition-colors flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-[#2C2C2C] overflow-x-auto no-scrollbar border-b border-[#444]">
               <IconButton icon="format_bold" className="!w-8 !h-8" onClick={() => insertText('**', '**')} title="Bold" />
               <IconButton icon="format_italic" className="!w-8 !h-8" onClick={() => insertText('*', '*')} title="Italic" />
               <div className="w-[1px] h-4 bg-[#555] mx-1"></div>
               <IconButton icon="code" className="!w-8 !h-8" onClick={() => insertText('`', '`')} title="Inline Code" />
               <IconButton icon="data_object" className="!w-8 !h-8" onClick={() => insertText('\n```\n', '\n```\n')} title="Code Block" />
               <div className="w-[1px] h-4 bg-[#555] mx-1"></div>
               <IconButton icon="image" className="!w-8 !h-8" onClick={() => onUploadImage ? onUploadImage() : handleMedia('image')} title="Insert Image" />
               <IconButton icon="movie" className="!w-8 !h-8" onClick={() => onUploadVideo ? onUploadVideo() : handleMedia('video')} title="Insert Video" />
               <div className="flex-1"></div>
               <IconButton icon="attach_file" className="!w-8 !h-8 !text-[#7DA3A1]" onClick={onAddAttachment} title="Add Attachment" />
            </div>
  
            <textarea 
              ref={textareaRef}
              className="w-full bg-[#1E1E1E] outline-none text-[#E6E6E6] resize-none min-h-[300px] font-mono p-4 text-sm leading-relaxed"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Start typing your knowledge..."
            />
         </div>
      </div>
    );
  };

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className = '', value, ...props }) => (
   <div className={`relative bg-[#2C2C2C] rounded-t-lg border-b border-[#8C918C] ${className}`}>
     <label className="block text-[#A0A0A0] text-xs pt-2 px-4">{label}</label>
     <textarea 
       className="w-full bg-transparent outline-none text-[#E6E6E6] font-sans px-4 pb-2 pt-1 resize-none h-24"
       value={value}
       {...props}
     />
   </div>
);

// --- Chips ---
export const Chip: React.FC<{ label: string; selected?: boolean; onClick?: () => void; onDelete?: () => void; icon?: string }> = ({ label, selected, onClick, onDelete, icon }) => (
  <div 
    onClick={onClick}
    className={`
      inline-flex items-center gap-2 h-8 px-4 rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 select-none
      ${selected 
        ? 'bg-[#B3C2B3] text-[#0F1D13] shadow-sm' 
        : 'bg-[#2C2C2C] border border-[#444] text-[#C7C7CC] hover:bg-[#383838]'
      }
    `}
  >
    {selected && <span className="material-symbols-rounded text-[16px]">check</span>}
    {!selected && icon && <span className="material-symbols-rounded text-[16px]">{icon}</span>}
    <span>{label}</span>
    {onDelete && (
      <span 
        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
        className="material-symbols-rounded text-[16px] ml-1 opacity-50 hover:opacity-100"
      >
        close
      </span>
    )}
  </div>
);

// --- Switch ---
export const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center gap-4 cursor-pointer" onClick={() => onChange(!checked)}>
    <div className={`w-[52px] h-[32px] rounded-full border-2 border-transparent relative transition-colors duration-300 ${checked ? 'bg-[#7DA3A1]' : 'bg-[#3E3E3E] border-[#8C918C]'}`}>
      <div className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-md transition-all duration-300 
          ${checked ? 'left-[24px] bg-[#0A1817] w-6 h-6' : 'left-[4px] bg-[#8C918C] w-4 h-4'}
      `}></div>
    </div>
    {label && <span className="text-base text-[#E6E6E6]">{label}</span>}
  </div>
);

// --- Dialog ---
export const Dialog: React.FC<{ open: boolean; title: string; children: React.ReactNode; onClose: () => void; actions?: React.ReactNode }> = ({ open, title, children, onClose, actions }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-[#2B2B2B] rounded-[28px] w-full max-w-sm p-6 flex flex-col shadow-2xl animate-[fadeIn_0.2s_ease-out]">
        <div className="mb-4">
            <span className="material-symbols-rounded text-[#7DA3A1] mb-4 text-3xl">info</span>
            <h4 className="text-2xl text-[#E6E6E6]">{title}</h4>
        </div>
        
        <div className="text-[#C7C7CC] text-base leading-relaxed mb-8">
          {children}
        </div>

        <div className="flex justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
};

// --- Avatar ---
export const Avatar: React.FC<{ src?: string; name: string; size?: 'sm' | 'md' | 'lg'; onClick?: () => void }> = ({ src, name, size = 'md', onClick }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' };
  return (
    <div onClick={onClick} className={`${sizes[size]} rounded-full bg-[#3E3E3E] text-[#E6E6E6] flex items-center justify-center font-bold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
    </div>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; variant?: 'elevated' | 'filled' | 'outlined'; onClick?: () => void; className?: string }> = ({ children, variant = 'filled', onClick, className = '' }) => {
  // MD3 Card styles: No borders, tonal colors
  const base = "rounded-[24px] p-5 transition-all duration-300 ease-out overflow-hidden relative";
  const filled = "bg-[#252529] hover:bg-[#2F2F34] hover:shadow-lg"; // Sumi-iro light variant
  const outlined = "bg-transparent border border-[#444] hover:bg-[#2C2C2C]";
  
  return (
    <div 
        onClick={onClick} 
        className={`${base} ${variant === 'outlined' ? outlined : filled} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* State Layer overlay (simulated with CSS hover on parent) */}
      {children}
    </div>
  );
};
