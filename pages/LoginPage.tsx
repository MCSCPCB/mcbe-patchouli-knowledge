import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    
    // 调用 Supabase 进行 GitHub 登录
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
    // 成功后会跳转，无需 setLoading(false)
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
      <div className="w-full max-w-md bg-[#2b2b2b] border-4 border-[#151515] p-8 shadow-[10px_10px_0_0_rgba(0,0,0,0.5)] relative">
        {/* Corner Decorations */}
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-white"></div>
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white"></div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#3C8527] mx-auto mb-4 border-2 border-white flex items-center justify-center shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.3)]">
             <span className="material-symbols-rounded text-white text-4xl">lock</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-mc mb-2">ACCESS REQUIRED</h2>
          <p className="text-[#b0b0b0] font-mono text-sm">Please identify yourself to proceed.</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2 bg-[#8B0000] border border-red-500 text-white font-mono text-xs">
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-4 bg-[#1e1e1f] border-2 border-[#5b5b5c] text-white font-mc tracking-widest hover:bg-[#fff] hover:text-black hover:border-white active:bg-[#ccc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
             <span className="material-symbols-rounded animate-spin">progress_activity</span>
          ) : (
             <span className="material-symbols-rounded">code</span>
          )}
          LOGIN WITH GITHUB
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
