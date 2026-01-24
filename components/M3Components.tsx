import React from 'react';

// --- 1. Icon Button (像素风格图标按钮) ---
export const IconButton = ({ 
  icon, 
  onClick, 
  className = '', 
  title 
}: { 
  icon: string; 
  onClick?: () => void; 
  className?: string; 
  title?: string;
}) => {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={`w-10 h-10 bg-[#3C8527] border-2 border-white shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:bg-[#4CAF50] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] active:translate-y-[2px] active:shadow-none transition-all ${className}`}
    >
      <span className="material-symbols-rounded text-white">{icon}</span>
    </button>
  );
};

// --- 2. Button (通用按钮) ---
export const Button = ({ 
  label, 
  onClick, 
  variant = 'filled',
  className = ''
}: { 
  label: string; 
  onClick?: () => void; 
  variant?: 'filled' | 'text';
  className?: string;
}) => {
  if (variant === 'text') {
    return (
      <button 
        onClick={onClick}
        className={`px-4 py-2 font-mc text-[#b0b0b0] hover:text-white uppercase transition-colors ${className}`}
      >
        {label}
      </button>
    );
  }
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 bg-[#1e1e1f] border-2 border-[#5b5b5c] text-white font-mc text-sm uppercase hover:bg-white hover:text-black hover:border-white transition-colors ${className}`}
    >
      {label}
    </button>
  );
};

// --- 3. Avatar (像素风格头像) ---
export const Avatar = ({ 
  src, 
  name,
  className = '' 
}: { 
  src?: string; 
  name?: string;
  className?: string; 
}) => {
  return (
    <div className={`w-10 h-10 border-2 border-white bg-[#1e1e1f] flex-shrink-0 ${className}`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover rendering-pixelated" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#3C8527] text-white font-bold text-lg">
           {name ? name[0].toUpperCase() : '?'}
        </div>
      )}
    </div>
  );
};

// --- 4. Dialog (像素风格弹窗) ---
export const Dialog = ({ 
  open, 
  title, 
  children, 
  onClose,
  actions 
}: { 
  open: boolean; 
  title: string; 
  children: React.ReactNode; 
  onClose: () => void;
  actions?: React.ReactNode;
}) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Content */}
      <div className="relative bg-[#2b2b2b] border-4 border-[#151515] p-6 w-full max-w-md shadow-[10px_10px_0_0_rgba(0,0,0,0.5)] animate-fade-in-up">
        {/* Decorative Corners */}
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-white"></div>
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white"></div>

        <h3 className="text-xl font-bold font-mc text-white mb-4 uppercase">{title}</h3>
        
        <div className="text-[#e0e0e0] font-mono mb-8">
          {children}
        </div>
        
        <div className="flex justify-end gap-4">
          {actions}
        </div>
      </div>
    </div>
  );
};

// --- 兼容性导出 ---
// 如果有地方引用了 M3Card，我们做一个简单的空实现防止报错
export const M3Card = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
