import React, { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

// ==========================================
// 1. Minecraft 深度语法支持 (McFunction, Molang, Lang)
// ==========================================

// --- A. Minecraft Commands (McFunction) ---
hljs.registerLanguage('mcfunction', (hljs) => ({
  name: 'Minecraft Commands',
  aliases: ['mc', 'minecraft', 'function'],
  case_insensitive: true,
  contains: [
    { className: 'keyword', begin: /^\s*\/?(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule|tag|team|bossbar|effect|enchant|experience|fill|fillbiome|gamemode|gamerule|help|item|kick|list|locate|loot|msg|particle|place|playsound|publish|reload|ride|save-all|save-off|save-on|seed|setblock|setidletimeout|setworldspawn|spawnpoint|spectate|spreadplayers|stop|stopsound|teammsg|time|tm|trigger|w|weather|worldborder|xp|damage|inputpermission|jfr|perf)\b/ },
    { className: 'built_in', begin: /\b(run|as|at|align|anchored|if|unless|store|result|success|matches|facing|rotated|positioned|in|dimension)\b/ },
    { className: 'variable', begin: /@[aeprs](\[[^\]]*\])?/ },
    { className: 'symbol', begin: /\b(minecraft:[a-z0-9_]+)\b/ },
    { className: 'number', begin: /[~^]-?(\d+(\.\d+)?)?|\b\d+(\.\d+)?[bdfilsw]?\b/ },
    { className: 'string', begin: /"[^"]*"/ },
    { className: 'string', begin: /'[^']*'/ },
    { className: 'comment', begin: /#.*/ }
  ]
}));

// --- B. Minecraft Molang (C-style Bedrock Scripting) ---
hljs.registerLanguage('molang', (hljs) => ({
  name: 'Molang',
  aliases: ['mo', 'molang'],
  case_insensitive: true,
  contains: [
    { className: 'built_in', begin: /\b(query|math|variable|texture|temp|geometry|material|array|c|q|v|t)\.[a-zA-Z0-9_]+\b/ },
    { className: 'keyword', begin: /\b(return|loop|for_each|break|continue)\b/ },
    { className: 'number', begin: /\b\d+(\.\d+)?\b/ },
    { className: 'operator', begin: /[\+\-\*\/=<>&|!?:]+/ },
    { className: 'string', begin: /'[^']*'/ },
    { className: 'comment', begin: /\/\/.*/ }
  ]
}));

// --- C. Minecraft Lang File (Key=Value) ---
hljs.registerLanguage('mclang', (hljs) => ({
  name: 'Minecraft Lang',
  aliases: ['lang', 'properties'],
  contains: [
    { className: 'attr', begin: /^[^#=\n]+/, end: /=/, excludeEnd: true },
    { className: 'string', begin: /=.*/, excludeBegin: true },
    { className: 'comment', begin: /#.*/ }
  ]
}));

// ==========================================
// 2. 智能代码块组件 (Mac Style + Auto Detect)
// ==========================================
interface CodeBlockProps {
  language: string;
  code: string;
}

const MacCodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState('text');
  const [highlightedHtml, setHighlightedHtml] = useState('');

  useEffect(() => {
    let result;
    if (language && hljs.getLanguage(language)) {
      result = hljs.highlight(code, { language });
      setDetectedLang(language);
    } else {
      result = hljs.highlightAuto(code);
      setDetectedLang(result.language || 'text');
    }
    setHighlightedHtml(result.value);
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = (lang: string) => {
    const map: Record<string, string> = {
      'mcfunction': 'MC COMMAND',
      'molang': 'MOLANG',
      'mclang': 'LANG FILE',
      'xml': 'XML/HTML'
    };
    return map[lang] || lang.toUpperCase();
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden bg-[#1e2024] border border-[#333] shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>
        <div className="text-xs font-mono text-[#666] group-hover:text-[#888] transition-colors uppercase tracking-wider select-none">
          {displayLang(detectedLang)}
        </div>
        <button onClick={handleCopy} className="text-[#666] hover:text-white transition-colors">
          <span className="material-symbols-rounded text-base">{copied ? 'check' : 'content_copy'}</span>
        </button>
      </div>
      <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
        <pre className="p-4 m-0">
          <code className={`font-mono text-sm leading-relaxed whitespace-pre language-${detectedLang}`} dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// 3. 核心渲染器 (已修复 Iframe/Video 渲染)
// ==========================================
export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  
  const renderInline = (text: string) => {
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, '<code class="bg-[#2D2D2D] text-[#A5C9A1] px-1.5 py-0.5 rounded text-sm font-mono border border-[#444] mx-1">$1</code>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full shadow-lg border border-[#333]"/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#E6E6E6] font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-[#B0B0B0] font-serif">$1</em>')
      .replace(/~~(.*?)~~/g, '<del class="text-[#888] decoration-[#888] opacity-70 decoration-1">$1</del>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#7DA3A1] hover:underline decoration-2 underline-offset-2 break-all">$1</a>');
  };

  const elements = [];
  // 修复关键点：正则中加入了 |<iframe[\s\S]*?<\/iframe>
  const regex = /(```(\w+)?\s*[\s\S]*?```|<video[\s\S]*?<\/video>|<iframe[\s\S]*?<\/iframe>)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index);
      elements.push(<div key={`text-${lastIndex}`} className="prose-part">{renderTextBlocks(textPart, renderInline)}</div>);
    }

    const block = match[0];
    if (block.startsWith('```')) {
      const codeMatch = block.match(/```(\w+)?\s*([\s\S]*?)```/);
      if (codeMatch) {
        elements.push(<MacCodeBlock key={`code-${match.index}`} language={codeMatch[1] || ''} code={codeMatch[2].trim()} />);
      }
    } else if (block.startsWith('<video') || block.startsWith('<iframe')) {
      // 视频和 iframe 都走这里，直接渲染 HTML
      elements.push(
        <div 
          key={`media-${match.index}`} 
          className="rounded-xl overflow-hidden my-6 shadow-lg border border-[#333] bg-black/20"
          dangerouslySetInnerHTML={{ __html: block }}
        />
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    elements.push(<div key={`text-end-${lastIndex}`} className="prose-part">{renderTextBlocks(content.slice(lastIndex), renderInline)}</div>);
  }

  return <div className="space-y-2">{elements}</div>;
};

// 辅助文本渲染 (保持不变)
const renderTextBlocks = (text: string, inlineParser: (s: string) => string) => {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-4" />;
    
    if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold text-[#E6E6E6] mt-8 mb-4 pb-2 border-b border-[#333]" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />;
    if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-2xl font-semibold text-[#E6E6E6] mt-6 mb-3" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(3))}} />;
    if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-xl font-medium text-[#C7C7CC] mt-4 mb-2" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(4))}} />;
    
    if (trimmed.startsWith('> ')) return <blockquote key={idx} className="border-l-4 border-[#7DA3A1] bg-[#7DA3A1]/10 pl-4 py-2 my-2 rounded-r italic text-[#E6E6E6]"><span dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></blockquote>;

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <div key={idx} className="flex gap-3 ml-2 my-1"><span className="text-[#7DA3A1] font-bold">•</span><span className="text-[#C7C7CC] flex-1 break-words" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></div>;

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) return <div key={idx} className="flex gap-3 ml-2 my-1"><span className="text-[#7DA3A1] font-mono font-bold">{orderedMatch[1]}.</span><span className="text-[#C7C7CC] flex-1 break-words" dangerouslySetInnerHTML={{__html: inlineParser(orderedMatch[2])}} /></div>;

    return <p key={idx} className="text-[#C7C7CC] leading-7 mb-2 break-words" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{__html: inlineParser(trimmed)}} />;
  });
};
