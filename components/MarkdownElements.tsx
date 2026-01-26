import React, { useState, useEffect, useCallback } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

// ==========================================
// 1. Minecraft 深度语法支持 (McFunction, Molang, Lang, Bedrock JSON)
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

// --- D. Bedrock JSON (JSON with Molang inside strings) ---
hljs.registerLanguage('json-molang', (hljs) => ({
  name: 'Bedrock JSON',
  aliases: ['bedrock', 'jsonm'],
  contains: [
    {
      className: 'attr',
      begin: /"(\\[\\"\"]|[^\\\"\n])*"(?=\s*:)/,
    },
    {
      className: 'string',
      begin: /"/, end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        {
          subLanguage: 'molang',
          begin: /[^\"]+/, 
        }
      ]
    },
    hljs.C_NUMBER_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    { className: 'literal', begin: /\b(true|false|null)\b/ },
    { className: 'punctuation', begin: /[\{\[\}\],:]/ }
  ]
}));


// ==========================================
// 2. 格式化工具函数 (The Formatter Core)
// ==========================================

/**
 * 通用代码格式化器 (模拟 VS Code 的缩进逻辑)
 * 适用于 JS, TS, CSS, Molang, McFunction 等基于块结构的语言
 */
const formatGenericCode = (code: string) => {
  const lines = code.split('\n');
  let indentLevel = 0;
  const indentString = '  '; // 2 spaces indentation
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue; // Skip empty lines

    // 检查是否是结束块 (}, ], ))
    // 如果这行以结束符号开头，先减少缩进
    const isClosingBlock = /^[\}\]\)]/.test(rawLine);
    if (isClosingBlock && indentLevel > 0) {
      indentLevel--;
    }

    // 应用缩进
    formattedLines.push(indentString.repeat(indentLevel) + rawLine);

    // 检查是否是开始块 ({, [, ()
    // 简单的启发式：行尾是打开符号，或者包含未闭合的打开符号
    // 这里做一个简化的行尾检查，覆盖 90% 的情况
    const hasOpening = /[\{\[\(]$/.test(rawLine);
    
    // 特殊情况处理：如果是单行同时包含开闭 (e.g. "{ ... }")，则不改变层级
    // 只有当这一行单纯是开启块时才增加缩进
    if (hasOpening && !isClosingBlock) {
       indentLevel++;
    }
  }
  return formattedLines.join('\n');
};

/**
 * HTML/XML 格式化器
 */
const formatXML = (xml: string) => {
  let formatted = '';
  let reg = /(>)(<)(\/*)/g;
  xml = xml.replace(reg, '$1\r\n$2$3');
  let pad = 0;
  xml.split('\r\n').forEach((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
      } else if (node.match(/^<\/\w/)) {
          if (pad !== 0) {
              pad -= 1;
          }
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
          indent = 1;
      } else {
          indent = 0;
      }

      let padding = '';
      for (let i = 0; i < pad; i++) {
          padding += '  ';
      }

      formatted += padding + node + '\r\n';
      pad += indent;
  });
  return formatted.trim();
};

// ==========================================
// 3. 智能代码块组件 (Mac Style + Auto Detect + Power Format)
// ==========================================
interface CodeBlockProps {
  language: string;
  code: string;
}

const MacCodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState('text');
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const [displayCode, setDisplayCode] = useState(code); 
  const [statusMsg, setStatusMsg] = useState<'formatted' | 'error' | null>(null);

  // 1. 初始化与语言检测
  useEffect(() => {
    setDisplayCode(code);
    setStatusMsg(null);
  }, [code]);

  useEffect(() => {
    let langToUse = language;
    const trimmed = displayCode.trim();

    // 智能语言纠正
    if (!langToUse) {
      const autoResult = hljs.highlightAuto(trimmed);
      langToUse = autoResult.language || 'plaintext';
      
      // Bedrock JSON 纠错逻辑
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (langToUse === 'molang' || langToUse === 'plaintext')) {
        langToUse = 'json-molang';
      }
    } else if (langToUse === 'json') {
       langToUse = 'json-molang';
    }

    setDetectedLang(langToUse);

    // 高亮处理
    let result;
    if (langToUse && hljs.getLanguage(langToUse)) {
      result = hljs.highlight(trimmed, { language: langToUse });
    } else {
      result = hljs.highlightAuto(trimmed);
    }
    setHighlightedHtml(result.value);

    // 自动格式化：仅针对看起来像压缩后的 JSON
    if (langToUse === 'json-molang' && !trimmed.includes('\n') && trimmed.length > 50) {
        // 使用 setTimeout 避免渲染阻塞
        const timer = setTimeout(() => handleFormat(langToUse, true), 100);
        return () => clearTimeout(timer);
    }

  }, [displayCode, language]); // Dependency removed: handleFormat to avoid loop

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * 核心格式化逻辑
   * @param lang 语言
   * @param silent 是否静默（不显示成功/失败状态）
   */
  const handleFormat = (lang = detectedLang, silent = false) => {
    const original = displayCode;
    let formatted = original;
    let success = false;

    try {
      if (lang === 'json' || lang === 'json-molang') {
        // 尝试标准 JSON 格式化
        const obj = JSON.parse(original);
        formatted = JSON.stringify(obj, null, 2);
        success = true;
      } else if (lang === 'xml' || lang === 'html' || lang === 'svg') {
        // XML/HTML 格式化
        formatted = formatXML(original);
        success = true;
      } else {
        // 其他语言 (JS, TS, CSS, McFunction, Molang) 使用通用缩进算法
        formatted = formatGenericCode(original);
        success = true;
      }
      
      if (success) {
        setDisplayCode(formatted);
        if (!silent) {
            setStatusMsg('formatted');
            setTimeout(() => setStatusMsg(null), 2000);
        }
      }
    } catch (e) {
      console.warn('Format failed', e);
      if (!silent) {
          setStatusMsg('error');
          setTimeout(() => setStatusMsg(null), 2000);
      }
    }
  };

  const displayLangLabel = (lang: string) => {
    const map: Record<string, string> = {
      'mcfunction': 'MC COMMAND',
      'molang': 'MOLANG',
      'mclang': 'LANG FILE',
      'json': 'JSON',
      'json-molang': 'BEDROCK JSON',
      'javascript': 'JS',
      'typescript': 'TS',
      'xml': 'XML',
      'html': 'HTML',
      'plaintext': 'TEXT'
    };
    return map[lang] || lang.toUpperCase();
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden bg-[#1e2024] border border-[#333] shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-[#444]">
      {/* Mac Window Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF4040] transition-colors" /> 
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFAD10] transition-colors" /> 
          <div className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#20A030] transition-colors" /> 
        </div>
        
        <div className="flex items-center gap-4">
           {/* Language Label */}
          <div className="text-xs font-mono text-[#666] group-hover:text-[#888] transition-colors uppercase tracking-wider select-none">
            {displayLangLabel(detectedLang)}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-0.5 border border-[#333]">
            {/* Format Button - Available for ALL languages now */}
            <button 
              onClick={() => handleFormat(detectedLang, false)}
              className={`
                relative flex items-center justify-center w-8 h-8 rounded-md transition-all
                ${statusMsg === 'error' ? 'text-red-400 bg-red-400/10' : ''}
                ${statusMsg === 'formatted' ? 'text-green-400 bg-green-400/10' : 'text-[#888] hover:text-white hover:bg-[#333]'}
              `}
              title="Format Code (Prettify)"
            >
              <span className="material-symbols-rounded text-[18px]">
                {statusMsg === 'formatted' ? 'check' : statusMsg === 'error' ? 'error' : 'data_object'}
              </span>
            </button>

            <div className="w-[1px] h-4 bg-[#333] mx-0.5"></div>

            {/* Copy Button */}
            <button 
              onClick={handleCopy}
              className={`
                flex items-center justify-center w-8 h-8 rounded-md transition-all
                ${copied ? 'text-green-400 bg-green-400/10' : 'text-[#888] hover:text-white hover:bg-[#333]'}
              `}
              title="Copy Code"
            >
              <span className="material-symbols-rounded text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Code Content */}
      <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
        <pre className="p-4 m-0">
          <code 
            className={`font-mono text-sm leading-relaxed whitespace-pre language-${detectedLang}`}
            style={{ fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace" }} // 强制等宽字体
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// 4. 核心渲染器 (保持原有增强功能)
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
      // Highlighting, Spoiler, Keys, etc.
      .replace(/==(.*?)==/g, '<mark class="bg-[#FCD34D] text-black px-1 rounded font-medium shadow-sm mx-0.5">$1</mark>')
      .replace(/\|\|(.*?)\|\|/g, '<span class="filter blur-[5px] hover:blur-0 transition-all duration-300 cursor-pointer select-none bg-white/10 px-1 rounded" title="Reveal Spoiler">$1</span>')
      .replace(/\[\[(.*?)\]\]/g, '<kbd class="bg-[#333] border border-[#555] border-b-[3px] rounded-md px-1.5 py-0.5 text-xs font-mono text-gray-200 mx-1 min-w-[20px] inline-block text-center shadow-sm">$1</kbd>')
      .replace(/%%(.*?)\|(.*?)%%/g, '<span style="font-family: \'$1\';">$2</span>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#7DA3A1] hover:underline decoration-2 underline-offset-2 break-all">$1</a>');
  };

  const elements = [];
  const regex = /(```(\w+)?\s*[\s\S]*?```|<(?:video|iframe)[\s\S]*?(?:<\/(?:video|iframe)>|\/>))/g;
  
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
        const langStr = codeMatch[1] || ''; 
        elements.push(
          <MacCodeBlock 
            key={`code-${match.index}`} 
            language={langStr} 
            code={codeMatch[2].trim()} 
          />
        );
      }
    } else if (block.startsWith('<video') || block.startsWith('<iframe')) {
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

// 辅助文本渲染
const renderTextBlocks = (text: string, inlineParser: (s: string) => string) => {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-4" />;
    
    if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold text-[#E6E6E6] mt-8 mb-4 pb-2 border-b border-[#333]" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />;
    if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-2xl font-semibold text-[#E6E6E6] mt-6 mb-3" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(3))}} />;
    if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-xl font-medium text-[#C7C7CC] mt-4 mb-2" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(4))}} />;
    
    if (trimmed.startsWith('> ')) {
      return <blockquote key={idx} className="border-l-4 border-[#7DA3A1] bg-[#7DA3A1]/10 pl-4 py-2 my-2 rounded-r italic text-[#E6E6E6]"><span dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></blockquote>;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
       return <div key={idx} className="flex gap-3 ml-2 my-1"><span className="text-[#7DA3A1] font-bold">•</span><span className="text-[#C7C7CC] flex-1 break-words" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></div>;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
        return <div key={idx} className="flex gap-3 ml-2 my-1"><span className="text-[#7DA3A1] font-mono font-bold">{orderedMatch[1]}.</span><span className="text-[#C7C7CC] flex-1 break-words" dangerouslySetInnerHTML={{__html: inlineParser(orderedMatch[2])}} /></div>;
    }

    return <p key={idx} className="text-[#C7C7CC] leading-7 mb-2 break-words" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{__html: inlineParser(trimmed)}} />;
  });
};
