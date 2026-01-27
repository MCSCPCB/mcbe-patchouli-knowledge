import React, { useState, useEffect, useMemo } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

// ==========================================
// 1. Minecraft 深度语法支持 (Ultimate Edition)
// ==========================================

// --- Shared Molang Rules ---
const MOLANG_RULES = [
  // Scoped Access (query.life_time)
  { className: 'built_in', begin: /\b(query|math|variable|texture|temp|geometry|material|array|context|c|q|v|t)\.[a-zA-Z0-9_]+/ },
  // Keywords
  { className: 'keyword', begin: /\b(return|loop|for_each|break|continue|this)\b/ },
  // Numbers
  { className: 'number', begin: /\b\d+(\.\d+)?\b/ },
  // Operators
  { className: 'operator', begin: /[\+\-\*\/=<>&|!?:]+/ },
];

// --- A. Text with Molang Fallback (New!) ---
hljs.registerLanguage('plaintext-molang', (hljs) => ({
  name: 'Text (Molang)',
  aliases: ['text', 'txt', 'plaintext'],
  disableAutodetect: true, // Used as manual fallback
  contains: [
    ...MOLANG_RULES,
    // Allow everything else as standard text
  ]
}));

// --- B. Minecraft Commands (McFunction) ---
hljs.registerLanguage('mcfunction', (hljs) => ({
  name: 'Minecraft Commands',
  aliases: ['mc', 'minecraft', 'cmd', 'mcfunction'],
  case_insensitive: true,
  contains: [
    { className: 'comment', begin: /#.*/ },
    { 
      className: 'keyword', 
      begin: /^\s*\/?\b(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule|tag|team|bossbar|effect|enchant|experience|fill|fillbiome|gamemode|gamerule|help|item|kick|list|locate|loot|msg|particle|place|playsound|publish|reload|ride|save-all|save-off|save-on|seed|setblock|setidletimeout|setworldspawn|spawnpoint|spectate|spreadplayers|stop|stopsound|teammsg|time|tm|trigger|w|weather|worldborder|xp|damage|inputpermission|jfr|perf|camera|dialogue|event|fog|mobevent|music|playanimation|structure|tickingarea|volumearea|return|transfer|random)\b/ 
    },
    { 
      className: 'literal', 
      begin: /\b(run|as|at|align|anchored|if|unless|store|result|success|matches|facing|rotated|positioned|in|dimension|type|name|tags|scores|level|distance|x|y|z|dx|dy|dz|limit|sort|gamemode|nbt|true|false|on|origin)\b/ 
    },
    { className: 'variable', begin: /@[aeprs](?:\[([^\]]*)\])?/ }, 
    { className: 'symbol', begin: /\b([a-z0-9_.-]+:[a-z0-9_./-]+)\b/ }, 
    { className: 'number', begin: /[~^](-?\d+(\.\d+)?)?|\b-?\d+(\.\d+)?[bdfilsw]?\b/ }, 
    { className: 'string', begin: /"[^"]*"/ },
    ...MOLANG_RULES
  ]
}));

// --- C. Bedrock JSON (Ultra Detailed) ---
hljs.registerLanguage('json-bedrock', (hljs) => ({
  name: 'Bedrock JSON',
  aliases: ['json', 'bedrock', 'jsonui', 'ui'],
  contains: [
    // 1. Punctuation (Gray) - NEW
    {
      className: 'punctuation',
      begin: /[\{\}\[\],:]/,
      relevance: 0
    },
    // 2. Namespaced Keys (Purple) - e.g. "minecraft:component"
    {
      className: 'keyword', 
      begin: /"(minecraft:[a-z0-9_.-]+|format_version)"(?=\s*:)/
    },
    // 3. UI/Special Keys (Blue)
    {
      className: 'keyword',
      begin: /"(type|controls|bindings|visible|texture|offset|size|layer|alpha|anchor_from|anchor_to|text|font_type|font_scale|color|ignored|variables|modifications|components|description|events)"(?=\s*:)/
    },
    // 4. Standard Keys (Red/Orange)
    {
      className: 'attr', 
      begin: /"(\\[\\"\"]|[^\\\"\n])*"(?=\s*:)/,
    },
    // 5. Resource Location Values (Cyan)
    {
        className: 'symbol',
        begin: /"minecraft:[a-z0-9_.-]+"/
    },
    // 6. Values with Molang
    {
      className: 'string',
      begin: /"/, end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        { subLanguage: 'molang', begin: /[^\"]+/, relevance: 0 }
      ]
    },
    hljs.C_NUMBER_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.C_LINE_COMMENT_MODE,
    { className: 'literal', begin: /\b(true|false|null)\b/ },
  ]
}));

// --- D. Bedrock JavaScript (API Aware) ---
// Custom definitions to ensure 'world.afterEvents' etc. are highlighted
hljs.registerLanguage('javascript-bedrock', (hljs) => ({
  name: 'Bedrock JS',
  aliases: ['js', 'ts', 'javascript', 'typescript', 'mj'],
  keywords: {
    keyword: 'const let var function return if else for while switch case break continue new class extends export import from await async try catch throw delete typeof void instanceof this super interface type',
    literal: 'true false null undefined NaN Infinity',
    built_in: 'console Math JSON Promise Map Set Array Object String Number Boolean RegExp Date Error Symbol world system BlockPermutation ItemStack Dimension EntityType BlockType GameMode'
  },
  contains: [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.C_NUMBER_MODE,
    // 1. Minecraft API Built-ins (Objects)
    {
      className: 'built_in',
      begin: /\b(world|system)(?=\.)/
    },
    // 2. Property Chains (Deep highlighting)
    // Matches .something after an object or previous property
    {
      className: 'property',
      begin: /(?<=\.)[a-zA-Z0-9_]+/,
      relevance: 0
    },
    // 3. Function Calls
    {
      className: 'function',
      begin: /\w+(?=\()/,
      relevance: 0
    },
    { className: 'operator', begin: /=>/ }
  ]
}));

// --- E. Lang & Molang ---
hljs.registerLanguage('molang', (hljs) => ({
    name: 'Molang', aliases: ['mo'], contains: [
        hljs.C_NUMBER_MODE, { className: 'string', begin: /'/, end: /'/ }, ...MOLANG_RULES
    ]
}));
hljs.registerLanguage('lang', (hljs) => ({
    name: 'Lang', contains: [ hljs.COMMENT(/#/, /$/), { className: 'variable', begin: /^[a-zA-Z0-9_.-]+/ }, { className: 'string', begin: /=/, end: /$/ } ]
}));


// ==========================================
// 2. 智能代码块组件
// ==========================================
interface CodeBlockProps {
  language: string;
  code: string;
}

const MacCodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [formattedCode, setFormattedCode] = useState(code);
  const [detectedLang, setDetectedLang] = useState('plaintext-molang');
  const [highlightedHtml, setHighlightedHtml] = useState('');

  const normalizeLang = (lang: string) => {
    const lower = lang?.toLowerCase() || '';
    const map: Record<string, string> = {
        'js': 'javascript-bedrock', 'ts': 'javascript-bedrock', 
        'jsx': 'javascript-bedrock', 'tsx': 'javascript-bedrock',
        'json': 'json-bedrock', 'jsonui': 'json-bedrock',
        'mc': 'mcfunction', 'cmd': 'mcfunction',
        'mo': 'molang', 'molang': 'molang',
        'lang': 'lang', 'txt': 'plaintext-molang', 'text': 'plaintext-molang'
    };
    return map[lower] || lower || 'plaintext-molang';
  };

  const getDisplayLabel = (lang: string) => {
    const map: Record<string, string> = {
      'mcfunction': 'McFunction',
      'molang': 'Molang',
      'json-bedrock': 'JSON',
      'javascript-bedrock': 'JavaScript (MC)',
      'lang': 'Lang',
      'plaintext-molang': 'Text',
    };
    return map[lang] || lang.toUpperCase();
  };

  // Improved Detection Logic
  const detectLanguage = (codeSnippet: string) => {
    const c = codeSnippet.trim();
    
    // JSON
    if (c.startsWith('{') || c.startsWith('[')) return 'json-bedrock';
    if (/^"[\w\d_]+" *:/.test(c)) return 'json-bedrock';
    
    // JS/TS (Strict)
    if (/\b(const|let|var|function|import|export|class|interface|=>|await world|system\.)\b/.test(c)) {
        return 'javascript-bedrock';
    }

    // McFunction
    if (/^\s*\/?(execute|scoreboard|data|give|summon|tag|function|fill|setblock|say|title)\b/m.test(c)) return 'mcfunction';
    
    // Molang (Strict)
    if (/\b(query|math|variable)\.[a-zA-Z0-9_]+/.test(c)) return 'molang';
    
    // Lang
    if (/^[\w\.]+=[^\n]+$/m.test(c) && !c.includes(';') && !c.includes('{')) return 'lang';

    return null;
  };

  useEffect(() => {
    let finalLang = normalizeLang(language);
    let codeToRender = code;

    // Auto Format JSON
    if (finalLang === 'json-bedrock') {
        try {
            if ((code.startsWith('{') || code.startsWith('[')) && !code.includes('\n')) {
                const parsed = JSON.parse(code);
                codeToRender = JSON.stringify(parsed, null, 2);
            }
        } catch (e) { /* ignore */ }
    }

    // Auto-detection
    if (finalLang === 'plaintext-molang') {
        const heuristic = detectLanguage(codeToRender);
        if (heuristic) {
            finalLang = heuristic;
        } else {
            // Default to plaintext-molang if auto-detect fails, 
            // ensuring Molang in text is always highlighted.
            finalLang = 'plaintext-molang'; 
        }
    }

    setFormattedCode(codeToRender);
    setDetectedLang(finalLang);

    try {
        if (hljs.getLanguage(finalLang)) {
            setHighlightedHtml(hljs.highlight(codeToRender, { language: finalLang }).value);
        } else {
            setHighlightedHtml(hljs.highlight(codeToRender, { language: 'plaintext-molang' }).value);
        }
    } catch (e) {
        setHighlightedHtml(hljs.highlight(codeToRender, { language: 'plaintext-molang' }).value);
    }

  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-5 rounded-xl overflow-hidden bg-[#23272e] border border-[#3b4252] shadow-2xl font-sans">
      <div className="flex items-center justify-between px-4 py-3 bg-[#282c34] border-b border-[#3b4252]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" /> 
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" /> 
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" /> 
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-mono text-[#abb2bf] group-hover:text-[#fff] transition-colors select-none">
            {getDisplayLabel(detectedLang)}
          </span>
          <div className="w-[1px] h-3 bg-[#3e4451]"></div>
          <button 
            onClick={handleCopy}
            className="flex items-center justify-center text-[#abb2bf] hover:text-[#fff] transition-colors"
            title="Copy"
          >
            <span className="material-symbols-rounded text-sm">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>
      </div>
      <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-[#3b4252] scrollbar-track-transparent">
        <pre className="p-4 m-0">
          <code 
            className={`text-[13px] leading-relaxed whitespace-pre language-${detectedLang}`}
            style={{ 
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              color: '#abb2bf' 
            }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// 3. 核心渲染器 (Refined)
// ==========================================

const parseZaoziInfo = (desc: string) => {
  desc = desc.trim();
  let mode = 'lr'; let p1 = '?'; let p2 = '?';
  const clean = (s: string) => s.replace(/字(头|框|底|旁|儿)/g, '').trim();
  const funcMatch = desc.match(/^([^\(（]+)[\(（](.*?)[\,，](.*?)[\)）]$/);
  
  if (funcMatch) {
    const type = funcMatch[1].trim().toLowerCase();
    p1 = clean(funcMatch[2]); p2 = clean(funcMatch[3]);
    if (['包围', 'surround', 'bw', 'inside', '全包', '半包'].includes(type)) mode = 'surround';
    else if (['上下', 'tb', 'sx', 'updown'].includes(type)) mode = 'tb';
  } else if (desc.includes('+')) {
    const parts = desc.split('+'); p1 = clean(parts[0]); p2 = clean(parts[1]);
    const SURROUND_SET = new Set(['风', '囗', '门', '辶', '走', '疒', '尸', '广', '厂', '气', '弋', '戈', '户', '匚', '冂', '凵', '勹', '几', '框']);
    if (SURROUND_SET.has(p1)) mode = 'surround';
  }
  return { mode, p1, p2 };
};

const generateZaoziHtml = (info: { mode: string, p1: string, p2: string }) => {
  const { mode, p1, p2 } = info;
  if (mode === 'surround') {
    return `<span class="inline-grid place-items-center w-[1em] h-[1em] align-text-bottom mx-[1px] leading-none select-none relative top-[1px]">
      <span class="col-start-1 row-start-1 text-[1em] z-0 scale-[1.0]">${p1}</span>
      <span class="col-start-1 row-start-1 text-[0.6em] z-10 scale-[0.7] translate-y-[1px]">${p2}</span>
    </span>`;
  }
  if (mode === 'tb') {
    return `<span class="inline-flex flex-col w-[1em] h-[1em] align-text-bottom mx-[1px] leading-none select-none justify-center relative top-[0.5px]">
      <span class="flex-1 w-full flex items-end justify-center overflow-visible text-[0.6em] h-[50%] leading-none scale-y-[0.7] scale-x-[0.9] origin-bottom">${p1}</span>
      <span class="flex-1 w-full flex items-start justify-center overflow-visible text-[0.6em] h-[50%] leading-none scale-y-[0.7] scale-x-[0.9] origin-top">${p2}</span>
    </span>`;
  }
  return `<span class="inline-flex flex-row w-[1em] h-[1em] align-text-bottom mx-[1px] leading-none select-none items-center relative top-[0.5px]">
    <span class="flex-1 h-full flex items-center justify-end overflow-visible text-[0.6em] w-[50%] scale-x-[0.7] scale-y-[0.9] origin-right">${p1}</span>
    <span class="flex-1 h-full flex items-center justify-start overflow-visible text-[0.6em] w-[50%] scale-x-[0.7] scale-y-[0.9] origin-left">${p2}</span>
  </span>`;
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const zaoziRegistry = useMemo(() => {
    const registry: Record<string, string> = {};
    const regex = /\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9]+)\s*[|｜]\s*(.*?)\]/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      registry[match[1]] = generateZaoziHtml(parseZaoziInfo(match[2]));
    }
    return registry;
  }, [content]);

  const renderInline = (text: string) => {
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, '<code class="bg-[#2c313a] text-[#98c379] px-1.5 py-0.5 rounded text-sm font-mono border border-[#3e4451] mx-1">$1</code>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full shadow-lg border border-[#3e4451]"/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#FFFFFF] font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-[#BBBBBB] italic font-serif">$1</em>')
      .replace(/~~(.*?)~~/g, '<del class="text-[#666] decoration-1">$1</del>')
      .replace(/%%(.*?)\|(.*?)%%/g, '<span style="font-family: \'$1\', sans-serif;">$2</span>')
      .replace(/\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9]+)\s*[|｜]\s*(.*?)\]/gi, '') 
      .replace(/:([a-zA-Z0-9]+):/g, (match, pinyin) => zaoziRegistry[pinyin] || match)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#61afef] hover:underline decoration-2 underline-offset-2 break-all">$1</a>');
  };

  const elements = [];
  const regex = /(```(\w+)?\s*[\s\S]*?```|<(?:video|iframe)[\s\S]*?(?:<\/(?:video|iframe)>|\/>))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index);
      if (textPart.trim()) elements.push(<div key={`text-${lastIndex}`} className="prose-part">{renderTextBlocks(textPart, renderInline)}</div>);
    }
    const block = match[0];
    if (block.startsWith('```')) {
      const codeMatch = block.match(/```(\w+)?\s*([\s\S]*?)```/);
      if (codeMatch) elements.push(<MacCodeBlock key={`code-${match.index}`} language={codeMatch[1] || ''} code={codeMatch[2].trim()} />);
    } else {
      elements.push(<div key={`media-${match.index}`} className="rounded-xl overflow-hidden my-6 shadow-lg border border-[#3e4451] bg-black/20" dangerouslySetInnerHTML={{ __html: block }} />);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    const textPart = content.slice(lastIndex);
    if (textPart.trim()) elements.push(<div key={`text-end-${lastIndex}`} className="prose-part">{renderTextBlocks(textPart, renderInline)}</div>);
  }

  return <div className="space-y-1 text-[#abb2bf]">{elements}</div>;
};

const renderTextBlocks = (text: string, inlineParser: (s: string) => string) => {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2" />;
    if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold text-[#FFFFFF] mt-8 mb-4 pb-2 border-b border-[#3e4451]" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />;
    if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-2xl font-semibold text-[#EEEEEE] mt-6 mb-3" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(3))}} />;
    if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-xl font-medium text-[#DDDDDD] mt-4 mb-2" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(4))}} />;
    if (trimmed.startsWith('> ')) return <blockquote key={idx} className="border-l-4 border-[#5c6370] bg-[#2c313a]/50 pl-4 py-2 my-2 rounded-r italic text-[#BBBBBB]"><span dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></blockquote>;
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <div key={idx} className="flex gap-2 ml-2 my-1"><span className="text-[#61afef] font-bold">•</span><span className="flex-1 break-words leading-7" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></div>;
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) return <div key={idx} className="flex gap-2 ml-2 my-1"><span className="text-[#61afef] font-mono font-bold">{orderedMatch[1]}.</span><span className="flex-1 break-words leading-7" dangerouslySetInnerHTML={{__html: inlineParser(orderedMatch[2])}} /></div>;
    return <p key={idx} className="leading-7 mb-2 break-words text-justify" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{__html: inlineParser(trimmed)}} />;
  });
};
