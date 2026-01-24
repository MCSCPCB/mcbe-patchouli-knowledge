import React, { useState } from 'react';
// 👇 请根据你项目的实际路径修改这个引用
import { supabase } from '../service/supabaseClient'; 

interface LoginProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // 处理邮箱认证
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: '注册确认邮件已发送，请查收', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin(); // 登录成功
      }
    } catch (error: any) {
      setMessage({ text: error.message || '操作失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 处理 GitHub 登录
  const handleGithubLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
      });
      if (error) throw error;
      // OAuth 通常会跳转，所以这里不需要立即调用 onLogin，
      // 而是通过 Supabase 的 onAuthStateChange 监听器在 App 入口处处理 session
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  return (
    // Surface: MD3 推荐的深色背景通常不是纯黑，而是极深的灰色 (#121212 or #0F0F0F)
    <div className="min-h-screen flex items-center justify-center bg-[#121212] text-[#E3E3E3] font-sans p-4">
      
      {/* Surface Container High: 卡片容器 */}
      <div className="w-full max-w-md bg-[#1E1E1E] rounded-[28px] p-8 shadow-xl animate-[slideUp_0.4s_ease-out]">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#2C2C2C] rounded-[20px] flex items-center justify-center mb-4 shadow-inner">
             <span className="material-symbols-rounded text-3xl text-[#D0BCFF]">menu_book</span>
          </div>
          <h1 className="text-3xl font-normal tracking-tight text-[#E3E3E3]">Patchouli</h1>
          <p className="text-sm text-[#C4C7C5] mt-1 tracking-wide">Knowledge Archive</p>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          
          {/* Material Design 3 Filled Input - Email */}
          <div className="group relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="peer block w-full rounded-t-xl border-b-2 border-[#444746] bg-[#2A2A2A] px-4 pt-6 pb-2 text-base text-[#E3E3E3] focus:border-[#D0BCFF] focus:bg-[#333] focus:outline-none transition-colors"
              placeholder=" "
            />
            <label
              htmlFor="email"
              className="absolute left-4 top-4 z-10 origin-[0] -translate-y-3 scale-75 text-[#C4C7C5] duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-[#D0BCFF]"
            >
              Email
            </label>
          </div>

          {/* Material Design 3 Filled Input - Password */}
          <div className="group relative">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="peer block w-full rounded-t-xl border-b-2 border-[#444746] bg-[#2A2A2A] px-4 pt-6 pb-2 text-base text-[#E3E3E3] focus:border-[#D0BCFF] focus:bg-[#333] focus:outline-none transition-colors"
              placeholder=" "
            />
            <label
              htmlFor="password"
              className="absolute left-4 top-4 z-10 origin-[0] -translate-y-3 scale-75 text-[#C4C7C5] duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-[#D0BCFF]"
            >
              Password
            </label>
          </div>

          {/* Error/Success Message */}
          {message && (
            <div className={`text-sm px-4 py-2 rounded-lg ${message.type === 'error' ? 'bg-[#3C1E1E] text-[#F2B8B5]' : 'bg-[#1E3C26] text-[#B8F2C2]'}`}>
              {message.text}
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-full bg-[#D0BCFF] text-[#381E72] text-sm font-medium hover:bg-[#E8DEF8] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-[#D0BCFF] hover:text-[#E8DEF8] font-medium py-2 px-4 rounded-full hover:bg-[#381E72]/20 transition-colors"
          >
            {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-[#444746]"></div>
          <span className="text-xs text-[#8E918F] font-medium">OR</span>
          <div className="h-[1px] flex-1 bg-[#444746]"></div>
        </div>

        {/* GitHub Button (Outlined variant) */}
        <button
          onClick={handleGithubLogin}
          className="h-12 w-full rounded-full border border-[#8E918F] text-[#E3E3E3] text-sm font-medium flex items-center justify-center gap-3 hover:bg-[#2A2A2A] hover:border-[#C4C7C5] transition-all duration-200"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
             <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

      </div>
    </div>
  );
};

export default LoginPage;
