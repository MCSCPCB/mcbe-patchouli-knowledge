import React, { useState, useEffect, useMemo } from 'react';
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
    { className: 'variable', begin: /@[aeprs](\[[^\]]*\])?/ }, // 选择器 @a[tag=s]
    { className: 'symbol', begin: /\b(minecraft:[a-z0-9_]+)\b/ }, // 命名空间 ID
    { className: 'number', begin: /[~^]-?(\d+(\.\d+)?)?|\b\d+(\.\d+)?[bdfilsw]?\b/ }, // 坐标与数字
    { className: 'string', begin: /"[^"]*"/ }, // 字符串
    { className: 'string', begin: /'[^']*'/ }, // 单引号字符串 (JSON text)
    { className: 'comment', begin: /#.*/ }
  ]
}));

// --- B. Minecraft Molang (C-style Bedrock Scripting) ---
hljs.registerLanguage('molang', (hljs) => ({
  name: 'Molang',
  aliases: ['mo', 'molang'],
  case_insensitive: true,
  contains: [
    { className: 'built_in', begin: /\b(query|math|variable|texture|temp|geometry|material|array|c|q|v|t)\.[a-zA-Z0-9_]+\b/ }, // query.anim_time
    { className: 'keyword', begin: /\b(return|loop|for_each|break|continue)\b/ },
    { className: 'number', begin: /\b\d+(\.\d+)?\b/ },
    { className: 'operator', begin: /[\+\-\*\/=<>&|!?:]+/ },
    { className: 'string', begin: /'[^']*'/ },
    { className: 'comment', begin: /\/\/.*/ } // Molang 注释
  ]
}));

// --- C. Minecraft Lang File (Key=Value) ---
hljs.registerLanguage('mclang', (hljs) => ({
  name: 'Minecraft Lang',
  aliases: ['lang', 'properties'],
  contains: [
    { className: 'attr', begin: /^[^#=\n]+/, end: /=/, excludeEnd: true }, // Key
    { className: 'string', begin: /=.*/, excludeBegin: true }, // Value
    { className: 'comment', begin: /#.*/ }
  ]
}));

// --- D. Bedrock JSON (JSON with Molang inside strings) ---
// 解决 "不要把包含molang的json识别成molang" 的问题，同时提供高亮支持
hljs.registerLanguage('json-molang', (hljs) => ({
  name: 'Bedrock JSON',
  aliases: ['bedrock', 'jsonm'],
  contains: [
    {
      className: 'attr',
      begin: /"(\\[\\"\"]|[^\\\"\n])*"(?=\s*:)/, // JSON Key
    },
    {
      className: 'string',
      begin: /"/, end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        // 在字符串内部尝试使用 Molang 高亮
        {
          subLanguage: 'molang',
          begin: /[^\"]+/, // 匹配字符串内容
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
// 2. 智能代码块组件 (Mac Style + Auto Detect + Format)
// ==========================================
interface CodeBlockProps {
  language: string;
  code: string;
}

const MacCodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState('text');
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const [displayCode, setDisplayCode] = useState(code); // 本地状态，用于支持格式化后的代码显示
  const [isFormatted, setIsFormatted] = useState(false);

  useEffect(() => {
    // 重置代码显示（当 props.code 变化时）
    setDisplayCode(code);
    setIsFormatted(false);
  }, [code]);

  useEffect(() => {
    let langToUse = language;
    const trimmed = displayCode.trim();

    // 1. 智能语言纠正 (Precision Language Detection)
    // 如果没有指定语言，或者指定了但需要检查是否为 JSON (防止被识别为 Molang)
    if (!langToUse) {
      const autoResult = hljs.highlightAuto(trimmed);
      langToUse = autoResult.language || 'plaintext';

      // 纠正逻辑：如果代码以 { 或 [ 开头，即使 autoDetect 认为是 molang，也强制视为 json-molang
      // 这样既能正确显示 JSON 结构，又能高亮内部的 Molang
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (langToUse === 'molang' || langToUse === 'plaintext')) {
        langToUse = 'json-molang';
      }
    } else if (langToUse === 'json') {
       // 如果用户明确写了 json，我们也优先使用 bedrock json 以支持 molang 高亮
       langToUse = 'json-molang';
    }

    setDetectedLang(langToUse);

    // 2. 代码高亮
    let result;
    if (langToUse && hljs.getLanguage(langToUse)) {
      result = hljs.highlight(trimmed, { language: langToUse });
    } else {
      result = hljs.highlightAuto(trimmed);
    }
    setHighlightedHtml(result.value);

    // 3. 自动格式化 (Auto Formatting)
    // 如果是 JSON 且看起来是压缩过的（没有换行），尝试自动格式化
    if (!isFormatted && (langToUse === 'json' || langToUse === 'json-molang') && !trimmed.includes('\n') && trimmed.length > 2) {
       handleFormat(langToUse);
    }

  }, [displayCode, language, isFormatted]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = (lang = detectedLang) => {
    if (lang === 'json' || lang === 'json-molang') {
      try {
        const obj = JSON.parse(displayCode);
        const formatted = JSON.stringify(obj, null, 2);
        setDisplayCode(formatted);
        setIsFormatted(true);
      } catch (e) {
        // 解析失败，不做处理
        console.warn('Auto format failed', e);
      }
    }
  };

  // 显示在右上角的语言标签映射
  const displayLangLabel = (lang: string) => {
    const map: Record<string, string> = {
      'mcfunction': 'MC COMMAND',
      'molang': 'MOLANG',
      'mclang': 'LANG FILE',
      'json': 'JSON',
      'json-molang': 'BEDROCK JSON',
      'javascript': 'JS',
      'typescript': 'TS',
      'plaintext': 'TEXT'
    };
    return map[lang] || lang.toUpperCase();
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden bg-[#1e2024] border border-[#333] shadow-xl">
      {/* Mac Window Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" /> 
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" /> 
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" /> 
        </div>
        
        <div className="flex items-center gap-4">
           {/* Language Label */}
          <div className="text-xs font-mono text-[#666] group-hover:text-[#888] transition-colors uppercase tracking-wider select-none">
            {displayLangLabel(detectedLang)}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Format Button (Only for JSON-like) */}
            {(detectedLang === 'json' || detectedLang === 'json-molang') && (
              <button 
                onClick={() => handleFormat()}
                className="text-[#666] hover:text-white transition-colors"
                title="Format JSON"
              >
                <span className="material-symbols-rounded text-base">data_object</span>
              </button>
            )}

            {/* Copy Button */}
            <button 
              onClick={handleCopy}
              className="text-[#666] hover:text-white transition-colors flex items-center"
              title="Copy Code"
            >
              <span className="material-symbols-rounded text-base">
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
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// 3. 核心渲染器 (修复视频渲染 + 增加趣味文本 + 汉字造字)
// ==========================================

// --- Zaozi Helper ---
const parseZaoziInfo = (desc: string) => {
  desc = desc.trim();
  let mode = 'lr'; // default to left-right
  let p1 = '?'; 
  let p2 = '?';

  // 清理：去掉 "字头", "字旁" 等干扰词，只取单字
  const clean = (s: string) => s.replace(/字(头|框|底|旁|儿)/g, '').trim();

  // 1. 显式结构: 包围(A, B)
  const funcMatch = desc.match(/^([^\(（]+)[\(（](.*?)[\,，](.*?)[\)）]$/);
  
  if (funcMatch) {
    const type = funcMatch[1].trim().toLowerCase();
    p1 = clean(funcMatch[2]);
    p2 = clean(funcMatch[3]);
    
    if (['包围', 'surround', 'bw', 'inside', '全包', '半包'].includes(type)) mode = 'surround';
    else if (['上下', 'tb', 'sx', 'updown'].includes(type)) mode = 'tb';
    else if (['左右', 'lr', 'zy', 'leftright'].includes(type)) mode = 'lr';
  } else if (desc.includes('+')) {
    // 2. 自动推断: A + B
    const parts = desc.split('+');
    p1 = clean(parts[0]);
    p2 = clean(parts[1]);
    
    // 包围结构启发式列表
    const SURROUND_SET = new Set([
      '风', '囗', '门', '辶', '走', '疒', '尸', '广', '厂', '气', '弋', '戈', '户', 
      '匚', '冂', '凵', '勹', '几', '框'
    ]);
    if (SURROUND_SET.has(p1)) mode = 'surround';
  }
  
  return { mode, p1, p2 };
};

// 生成汉字的 HTML 结构
const generateZaoziHtml = (info: { mode: string, p1: string, p2: string }) => {
  const { mode, p1, p2 } = info;
  
  if (mode === 'surround') {
    return `<span class="inline-grid place-items-center w-[1em] h-[1em] align-middle mx-0.5 leading-none select-none" title="${p1}+${p2}">
      <span class="col-start-1 row-start-1 text-[1em] z-0">${p1}</span>
      <span class="col-start-1 row-start-1 text-[0.7em] z-10 pt-[0.3em] pl-[0.3em]">${p2}</span>
    </span>`;
  }
  
  if (mode === 'tb') { // Top-Bottom
    return `<span class="inline-flex flex-col w-[1em] h-[1em] align-middle mx-0.5 leading-none align-text-bottom select-none" title="${p1}+${p2}">
      <span class="flex-1 w-full flex items-center justify-center overflow-hidden text-[0.7em] -mb-[0.15em] scale-y-[0.85]">${p1}</span>
      <span class="flex-1 w-full flex items-center justify-center overflow-hidden text-[0.7em] -mt-[0.15em] scale-y-[0.85]">${p2}</span>
    </span>`;
  }
  
  // Default: Left-Right
  return `<span class="inline-flex flex-row w-[1em] h-[1em] align-middle mx-0.5 leading-none select-none" title="${p1}+${p2}">
    <span class="flex-1 h-full flex items-center justify-center overflow-hidden text-[0.7em] -mr-[0.1em] scale-x-[0.85]">${p1}</span>
    <span class="flex-1 h-full flex items-center justify-center overflow-hidden text-[0.7em] -ml-[0.1em] scale-x-[0.85]">${p2}</span>
  </span>`;
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  
  // 1. 预处理：扫描全文构建造字注册表
  const zaoziRegistry = useMemo(() => {
    const registry: Record<string, string> = {};
    const regex = /\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9]+)\s*[|｜]\s*(.*?)\]/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const pinyin = match[1];
      const desc = match[2];
      const info = parseZaoziInfo(desc);
      registry[pinyin] = generateZaoziHtml(info);
    }
    return registry;
  }, [content]);

  const renderInline = (text: string) => {
    let res = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      // Inline Code
      .replace(/`([^`]+)`/g, '<code class="bg-[#2D2D2D] text-[#A5C9A1] px-1.5 py-0.5 rounded text-sm font-mono border border-[#444] mx-1">$1</code>')
      // Images
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full shadow-lg border border-[#333]"/>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#E6E6E6] font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="text-[#B0B0B0] font-serif">$1</em>')
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<del class="text-[#888] decoration-[#888] opacity-70 decoration-1">$1</del>')
      // ----------------- 新增好玩的功能 -----------------
      // Highlight
      .replace(/==(.*?)==/g, '<mark class="bg-[#FCD34D] text-black px-1 rounded font-medium shadow-sm mx-0.5">$1</mark>')
      // Spoiler
      .replace(/\|\|(.*?)\|\|/g, '<span class="filter blur-[5px] hover:blur-0 transition-all duration-300 cursor-pointer select-none bg-white/10 px-1 rounded" title="Reveal Spoiler">$1</span>')
      // Keyboard Keys
      .replace(/\[\[(.*?)\]\]/g, '<kbd class="bg-[#333] border border-[#555] border-b-[3px] rounded-md px-1.5 py-0.5 text-xs font-mono text-gray-200 mx-1 min-w-[20px] inline-block text-center shadow-sm">$1</kbd>')
      // Custom Font
      .replace(/%%(.*?)\|(.*?)%%/g, '<span style="font-family: \'$1\';">$2</span>')
      // ----------------- 造字功能渲染 -----------------
      // 1. 显示定义徽章: [造字: fx | ...]
      .replace(/\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9]+)\s*[|｜]\s*(.*?)\]/gi, (match, pinyin, desc) => {
         return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono select-none cursor-help" title="定义: ${desc}">
           <span class="material-symbols-rounded text-[10px]">brush</span>
           ${pinyin}
         </span>`;
      })
      // 2. 渲染已注册的字: :pinyin:
      .replace(/:([a-zA-Z0-9]+):/g, (match, pinyin) => {
         if (zaoziRegistry[pinyin]) {
           return zaoziRegistry[pinyin];
         }
         return match; // 未找到则不处理
      })
      // ---------------------------------------------------
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#7DA3A1] hover:underline decoration-2 underline-offset-2 break-all">$1</a>');
      
    return res;
  };

  const elements = [];
  // 修复：扩展 Regex 以捕获 video 和 iframe
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
