import React, { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css'; // 确保样式已加载

// === 1. Minecraft 专属语法高亮定义 ===
// 注册一次即可，让 /execute, @a, ~ ~ ~ 拥有专属颜色
hljs.registerLanguage('mcfunction', (hljs) => ({
  name: 'Minecraft Commands',
  aliases: ['mc', 'minecraft'],
  case_insensitive: true,
  contains: [
    { className: 'keyword', begin: /^\s*\/?(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule)\b/ },
    { className: 'built_in', begin: /\b(run|as|at|align|anchored|if|unless|store|result|success|matches)\b/ },
    { className: 'variable', begin: /@[aeprs](\[[^\]]*\])?/ }, // 目标选择器 @a[...]
    { className: 'number', begin: /[~^]-?(\d+(\.\d+)?)?|\b\d+(\.\d+)?[bdfilsw]?\b/ }, // 坐标 ~ ~1 和数字
    { className: 'string', begin: /"[^"]*"/ }, // NBT 字符串
    { className: 'comment', begin: /#.*/ }
  ]
}));

// === 2. Mac 风格代码块组件 ===
interface CodeBlockProps {
  language: string;
  code: string;
}

const MacCodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  
  // 自动检测语言或使用指定语言
  const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
  const highlighted = hljs.highlight(code, { language: validLang }).value;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden bg-[#1e2024] border border-[#333] shadow-xl">
      {/* Mac Window Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" /> {/* Close */}
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" /> {/* Minimize */}
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" /> {/* Maximize */}
        </div>
        <div className="text-xs font-mono text-[#888] uppercase tracking-wider select-none">
          {validLang === 'mcfunction' ? 'MINECRAFT' : validLang}
        </div>
        <button 
          onClick={handleCopy}
          className="text-[#888] hover:text-white transition-colors"
          title="Copy Code"
        >
          <span className="material-symbols-rounded text-base">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>
      
      {/* Code Content */}
      <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
        <pre className="p-4 m-0">
          <code 
            className={`font-mono text-sm leading-relaxed whitespace-pre language-${validLang}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
};

// === 3. 核心 Markdown 渲染器 ===
// 将文本拆分为：代码块、视频、普通文本，然后分别渲染
export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  
  // 辅助：解析行内样式 (Bold, Italic, Strike, InlineCode, Link)
  const renderInline = (text: string) => {
    // 这种简单的替换顺序很重要
    let html = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // 转义 HTML
      .replace(/`([^`]+)`/g, '<code class="bg-[#2D2D2D] text-[#A5C9A1] px-1.5 py-0.5 rounded text-sm font-mono border border-[#444] mx-1">$1</code>') // Inline Code
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full shadow-lg border border-[#333]"/>') // Images
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#E6E6E6] font-semibold">$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em class="text-[#B0B0B0] font-serif">$1</em>') // Italic
      .replace(/~~(.*?)~~/g, '<del class="opacity-60 decoration-2 decoration-[#CF6679]">$1</del>') // Strikethrough (新增)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#7DA3A1] hover:underline decoration-2 underline-offset-2 break-all">$1</a>'); // Links (支持换行)

    return html;
  };

  // 渲染逻辑
  const elements = [];
  const regex = /(```(\w+)?\s*[\s\S]*?```|<video[\s\S]*?<\/video>)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // 1. 处理匹配前的普通文本 (段落, 标题, 列表)
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index);
      elements.push(<div key={lastIndex} className="prose-part">{renderTextBlocks(textPart, renderInline)}</div>);
    }

    // 2. 处理特殊块 (Code or Video)
    const block = match[0];
    if (block.startsWith('```')) {
      // 提取代码和语言
      const codeMatch = block.match(/```(\w+)?\s*([\s\S]*?)```/);
      if (codeMatch) {
        elements.push(
          <MacCodeBlock 
            key={match.index} 
            language={codeMatch[1] || ''} 
            code={codeMatch[2].trim()} 
          />
        );
      }
    } else if (block.startsWith('<video')) {
      // 视频直接保留 HTML (dangerouslySetInnerHTML)
      // 为了安全，你可以选择在这里做一些清洗，或者直接渲染
      elements.push(
        <div 
          key={match.index} 
          className="rounded-xl overflow-hidden my-6 shadow-lg border border-[#333]"
          dangerouslySetInnerHTML={{ __html: block }}
        />
      );
    }

    lastIndex = regex.lastIndex;
  }

  // 3. 处理剩余文本
  if (lastIndex < content.length) {
    elements.push(<div key={lastIndex} className="prose-part">{renderTextBlocks(content.slice(lastIndex), renderInline)}</div>);
  }

  return <div className="space-y-2">{elements}</div>;
};

// 辅助：处理普通文本块 (Header, List, Quote, Paragraph)
const renderTextBlocks = (text: string, inlineParser: (s: string) => string) => {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-4" />; // 空行

    // Headers
    if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold text-[#E6E6E6] mt-8 mb-4 pb-2 border-b border-[#333]" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />;
    if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-2xl font-semibold text-[#E6E6E6] mt-6 mb-3" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(3))}} />;
    if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-xl font-medium text-[#C7C7CC] mt-4 mb-2" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(4))}} />;

    // Blockquote (引用)
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={idx} className="border-l-4 border-[#7DA3A1] bg-[#7DA3A1]/10 pl-4 py-2 my-2 rounded-r italic text-[#E6E6E6]">
           <span dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />
        </blockquote>
      );
    }

    // List Items (简单处理无序列表)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
       return (
         <div key={idx} className="flex gap-3 ml-2 my-1">
           <span className="text-[#7DA3A1] font-bold">•</span>
           <span className="text-[#C7C7CC] flex-1 break-words" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />
         </div>
       );
    }

    // List Items (简单处理有序列表 1. 2.)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
        return (
            <div key={idx} className="flex gap-3 ml-2 my-1">
                <span className="text-[#7DA3A1] font-mono font-bold">{orderedMatch[1]}.</span>
                <span className="text-[#C7C7CC] flex-1 break-words" dangerouslySetInnerHTML={{__html: inlineParser(orderedMatch[2])}} />
            </div>
        );
    }

    // Normal Paragraph
    return (
      <p 
        key={idx} 
        className="text-[#C7C7CC] leading-7 mb-2 break-words" 
        style={{ overflowWrap: 'anywhere' }} // 手机端长文本强制换行关键
        dangerouslySetInnerHTML={{__html: inlineParser(trimmed)}} 
      />
    );
  });
};
