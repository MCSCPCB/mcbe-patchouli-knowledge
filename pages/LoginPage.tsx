import React from 'react';
import { Button } from '../components/M3Components';

interface LoginProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#1e1e1f]">
      {/* Dirt Background Pattern Simulation */}
      <div 
        className="absolute inset-0 opacity-10 z-0" 
        style={{
            backgroundImage: `repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #313233 25%, #313233 75%, #000 75%, #000)`,
            backgroundPosition: '0 0, 10px 10px',
            backgroundSize: '20px 20px'
        }}
      ></div>

      <div className="z-10 flex flex-col items-center text-center max-w-md w-full">
        <div className="mb-8 p-6 bg-[#313233] border-4 border-[#5b5b5c] shadow-[8px_8px_0_0_#000]">
           <span className="material-symbols-rounded text-[64px] text-white">auto_stories</span>
        </div>
        
        <h1 className="text-6xl font-mc mb-4 text-white drop-shadow-[4px_4px_0_#000]">Patchouli</h1>
        <p className="text-xl font-mc text-[#b0b0b0] mb-12 drop-shadow-md">
          Collaborative Knowledge Base <br/>
          <span className="text-[#3C8527]">> Start Adventure</span>
        </p>

        <button 
          onClick={onLogin}
          className="w-full h-16 bg-[#3C8527] text-white font-mc text-2xl border-2 border-[#52A535] border-b-[#1A3B12] border-r-[#1A3B12] hover:bg-[#2E6B1E] active:border-t-[#1A3B12] active:border-l-[#1A3B12] shadow-[4px_4px_0_0_#000] flex items-center justify-center gap-4"
        >
          {/* GitHub Icon SVG */}
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
             <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Login with GitHub
        </button>
        
        <p className="mt-8 text-sm font-mc text-[#707070]">
          Mojang AB is not affiliated with this project.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;