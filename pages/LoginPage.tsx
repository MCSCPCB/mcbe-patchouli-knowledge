import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGithubLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    
    // 调用 Supabase OAuth
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        // 开发环境通常是 localhost:5173，生产环境是 Vercel 分配的域名
        redirectTo: window.location.origin 
      }
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
    // 注意：成功的话会跳转离开当前页面，所以不需要在这里 setLoading(false)
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
      <div className="bg-[#EEF1F4] p-8 rounded-[28px] max-w-sm w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-[#00668B] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg text-white">
           <span className="material-symbols-rounded text-3xl">lock</span>
        </div>
        
        <h2 className="text-2xl font-normal text-[#191C1E] mb-2">Welcome Back</h2>
        <p className="text-[#40484C] text-sm mb-8">
          请使用 GitHub 账号登录以访问知识库
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg text-left">
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleGithubLogin}
          disabled={loading}
          className="w-full h-14 bg-[#191C1E] text-white rounded-[24px] flex items-center justify-center gap-3 hover:shadow-lg active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
             <span className="material-symbols-rounded animate-spin">progress_activity</span>
          ) : (
             // 这里可以用 GitHub 图标 SVG，此处简化
             <span className="font-bold text-lg">Github</span> 
          )}
          <span className="font-medium">Continue with GitHub</span>
        </button>
      </div>
    </div>
  );
}
