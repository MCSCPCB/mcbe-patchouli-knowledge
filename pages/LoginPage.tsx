import React from 'react';
import { Button } from '../components/M3Components';

interface LoginProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs for flair */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-slate-200 rounded-full blur-[100px] opacity-50 z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-slate-300 rounded-full blur-[80px] opacity-40 z-0"></div>

      <div className="z-10 flex flex-col items-center text-center max-w-md animate-fade-in">
        <div className="mb-8 p-6 bg-slate-100 rounded-[32px] shadow-sm">
           <span className="material-symbols-rounded text-[64px] text-slate-700">auto_stories</span>
        </div>
        
        <h1 className="text-5xl font-bold mb-4 text-slate-900 tracking-tight">Patchouli</h1>
        <p className="text-xl text-slate-600 mb-12 leading-relaxed">
          The collaborative knowledge base driven by AI. <br/>
          Organize magic, scripts, and entities.
        </p>

        <button 
          onClick={onLogin}
          className="group relative w-full h-16 bg-[#24292F] text-white rounded-[24px] font-medium text-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
        >
          {/* GitHub Icon SVG */}
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
             <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>
        
        <p className="mt-8 text-sm text-slate-400">
          By continuing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
