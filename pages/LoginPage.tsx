import React from 'react';

interface LoginProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#121212]">
      {/* Abstract Background - Seigaiha (Waves) Abstraction */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#7DA3A1] blur-[150px] mix-blend-screen opacity-10 animate-[pulse_8s_infinite]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#493F54] blur-[120px] mix-blend-screen opacity-20" />
      </div>

      <div className="z-10 flex flex-col items-center text-center max-w-sm w-full animate-[slideUp_0.5s_ease-out]">
        <div className="mb-8 w-24 h-24 bg-gradient-to-br from-[#2D3635] to-[#1A1A1D] rounded-[32px] flex items-center justify-center shadow-2xl border border-[#333]">
           <span className="material-symbols-rounded text-[48px] text-[#7DA3A1]">menu_book</span>
        </div>
        
        <h1 className="text-5xl font-light text-[#E6E6E6] mb-2 tracking-tight">Patchouli</h1>
        <p className="text-sm font-medium text-[#8C918C] mb-12 uppercase tracking-[0.2em]">
          Knowledge Archive
        </p>

        <button 
          onClick={onLogin}
          className="group w-full h-14 bg-[#E6E6E6] text-[#121212] rounded-full font-medium text-lg hover:shadow-[0_0_20px_rgba(230,230,230,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden"
        >
          {/* GitHub Icon */}
          <svg className="w-6 h-6 fill-current z-10" viewBox="0 0 24 24">
             <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span className="z-10">Continue with GitHub</span>
          
          {/* Subtle shine effect */}
          <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out"></div>
        </button>
        
        <div className="mt-8 flex gap-4 opacity-40">
            <div className="w-2 h-2 rounded-full bg-[#7DA3A1]"></div>
            <div className="w-2 h-2 rounded-full bg-[#8C918C]"></div>
            <div className="w-2 h-2 rounded-full bg-[#493F54]"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
