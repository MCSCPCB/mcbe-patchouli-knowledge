import React, { useState, useEffect, useRef } from 'react';

// --- Utility: Ripple Effect ---
export const Ripple: React.FC = () => {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setRipples([]), 1000);
    return () => clearTimeout(timer);
  }, [ripples]);

  const addRipple = (e: React.MouseEvent) => {
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left;
    const y = e.clientY - container.top;
    setRipples([...ripples, { x, y, id: Date.now() }]);
  };

  return (
    <div className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none" onMouseDown={addRipple}>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-current opacity-10 rounded-full animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            transform: 'translate(-50%, -50%) scale(15)',
            transition: 'transform 0.5s, opacity 1s',
            animationDuration: '600ms'
          }}
        />
      ))}
    </div>
  );
};

// --- Buttons ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';
  icon?: string;
  label: string;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'filled', icon, label, className = '', fullWidth, ...props }) => {
  const base = "relative overflow-hidden h-10 px-6 rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]";
  
  const variants = {
    filled: "bg-slate-700 text-white hover:bg-slate-800 hover:shadow-md",
    elevated: "bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-100 hover:shadow-md",
    tonal: "bg-slate-200 text-slate-900 hover:bg-slate-300",
    outlined: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    text: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  return (
    <button className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
      {icon && <span className="material-symbols-rounded text-[18px]">{icon}</span>}
      <span className="z-10 relative">{label}</span>
      <Ripple />
    </button>
  );
};

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; active?: boolean }> = ({ icon, className = '', active, ...props }) => (
  <button 
    className={`relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'} ${className}`}
    {...props}
  >
    <span className={`material-symbols-rounded ${active ? 'filled' : ''}`}>{icon}</span>
    <Ripple />
  </button>
);

export const FAB: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; extended?: boolean; label?: string }> = ({ icon, extended, label, className = '', ...props }) => (
  <button 
    className={`fixed bottom-6 right-6 z-50 bg-slate-200 text-slate-900 shadow-lg hover:shadow-xl hover:bg-slate-300 transition-all duration-300 flex items-center justify-center gap-2
    ${extended ? 'h-14 px-5 rounded-[20px]' : 'w-14 h-14 rounded-[20px]'} ${className}`}
    {...props}
  >
    <span className="material-symbols-rounded text-[24px]">{icon}</span>
    {extended && <span className="font-medium text-[14px]">{label}</span>}
    <Ripple />
  </button>
);

// --- Inputs ---
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({ label, error, className = '', value, ...props }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && String(value).length > 0;

  return (
    <div className={`relative bg-slate-100 rounded-t-xl border-b transition-colors ${error ? 'border-red-500 bg-red-50' : (focused ? 'border-slate-700' : 'border-slate-400')} ${className}`}>
      <label 
        className={`absolute left-4 transition-all duration-200 pointer-events-none text-slate-500
        ${(focused || hasValue) ? 'top-2 text-xs' : 'top-4 text-base'}`}
      >
        {label}
      </label>
      <input
        className="w-full h-14 px-4 pt-5 pb-2 bg-transparent outline-none text-slate-900 caret-slate-700"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={value}
        {...props}
      />
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className = '', value, ...props }) => (
   <div className={`relative bg-slate-50 border border-slate-300 rounded-xl focus-within:border-slate-700 focus-within:ring-1 focus-within:ring-slate-700 transition-all p-4 ${className}`}>
      <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">{label}</label>
      <textarea 
        className="w-full bg-transparent outline-none text-slate-900 resize-none min-h-[120px] font-roboto"
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
      relative inline-flex items-center gap-2 h-8 px-3 rounded-lg border text-sm font-medium cursor-pointer transition-all select-none
      ${selected 
        ? 'bg-slate-200 border-transparent text-slate-900' 
        : 'bg-transparent border-slate-300 text-slate-600 hover:bg-slate-50'
      }
    `}
  >
    {selected && <span className="material-symbols-rounded text-[18px]">check</span>}
    {!selected && icon && <span className="material-symbols-rounded text-[18px]">{icon}</span>}
    <span>{label}</span>
    {onDelete && (
      <span 
        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
        className="material-symbols-rounded text-[16px] ml-1 hover:text-red-500"
      >
        close
      </span>
    )}
  </div>
);

// --- Switch ---
export const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center gap-4 cursor-pointer" onClick={() => onChange(!checked)}>
    <div className={`w-[52px] h-[32px] rounded-full p-[2px] transition-colors ${checked ? 'bg-slate-700' : 'bg-slate-300 border-2 border-slate-400'}`}>
      <div className={`w-7 h-7 bg-white rounded-full shadow-md transition-transform transform ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`}>
         {checked && <div className="hidden">Icon</div>} 
      </div>
    </div>
    {label && <span className="text-base text-slate-900">{label}</span>}
  </div>
);

// --- Dialog ---
export const Dialog: React.FC<{ open: boolean; title: string; children: React.ReactNode; onClose: () => void; actions?: React.ReactNode }> = ({ open, title, children, onClose, actions }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-[#F8F9FA] rounded-[28px] w-full max-w-sm md:max-w-md p-6 shadow-xl transform scale-100 transition-transform">
        <h4 className="text-2xl text-slate-900 mb-4 font-normal">{title}</h4>
        <div className="text-slate-600 mb-8 leading-relaxed">
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
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  return (
    <div onClick={onClick} className={`${sizes[size]} rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold overflow-hidden cursor-pointer hover:opacity-90`}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
    </div>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; variant?: 'elevated' | 'filled' | 'outlined'; onClick?: () => void; className?: string }> = ({ children, variant = 'elevated', onClick, className = '' }) => {
  const variants = {
    elevated: "bg-[#FDFDFD] shadow-sm hover:shadow-md",
    filled: "bg-[#F0F4F8] hover:bg-[#E8EEF3]",
    outlined: "bg-transparent border border-slate-200 hover:bg-slate-50"
  };
  return (
    <div onClick={onClick} className={`rounded-[20px] p-4 transition-all duration-200 cursor-pointer ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
