import React, { useState, useEffect, useMemo } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

// ==========================================
// 1. Minecraft 深度语法支持 (Enhanced Highlighting)
// ==========================================

// --- A. Minecraft Commands (McFunction) ---
hljs.registerLanguage('mcfunction', (hljs) => ({
  name: 'Minecraft Commands',
  aliases: ['mc', 'minecraft', 'function', 'cmd'],
  case_insensitive: true,
  contains: [
    { className: 'keyword', begin: /^\s*\/?(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule|tag|team|bossbar|effect|enchant|experience|fill|fillbiome|gamemode|gamerule|help|item|kick|list|locate|loot|msg|particle|place|playsound|publish|reload|ride|save-all|save-off|save-on|seed|setblock|setidletimeout|setworldspawn|spawnpoint|spectate|spreadplayers|stop|stopsound|teammsg|time|tm|trigger|w|weather|worldborder|xp|damage|inputpermission|jfr|perf|camera|dialogue|event|fog|mobevent|music|playanimation|structure|tickingarea|volumearea)\b/ },
    { className: 'literal', begin: /\b(run|as|at|align|anchored|if|unless|store|result|success|matches|facing|rotated|positioned|in|dimension|type|name|tags|scores|level|distance|x|y|z|dx|dy|dz|limit|sort|gamemode|nbt|true|false)\b/ },
    { className: 'variable', begin: /@[aeprs](\[[^\]]*\])?/ }, // Selectors
    { className: 'symbol', begin: /\b(minecraft:[a-z0-9_]+)\b/ }, // Namespaces
    { className: 'number', begin: /[~^]-?(\d+(\.\d+)?)?|\b\d+(\.\d+)?[bdfilsw]?\b/ }, // Coordinates & Numbers
    { className: 'string', begin: /"[^"]*"/ },
    { className: 'comment', begin: /#.*/ }
  ]
}));

// --- B. Minecraft Molang (Ultimate Edition) ---
hljs.registerLanguage('molang', (hljs) => ({
  name: 'Molang',
  aliases: ['mo', 'molang', 'bedrock-script'],
  case_insensitive: true,
  contains: [
    // 1. Keywords
    { className: 'keyword', begin: /\b(return|loop|for_each|break|continue|this)\b/ },
    // 2. Main Scopes (query, math, etc.) - rendered as types/built-ins
    { 
      className: 'built_in', 
      begin: /\b(query|math|variable|texture|temp|geometry|material|array|context|c|q|v|t)\b(?=\.)/ 
    },
    // 3. Properties/Functions after dot
    {
      className: 'property',
      begin: /(?<=\.)[a-zA-Z0-9_]+/,
    },
    // 4. Numbers
    { className: 'number', begin: /\b\d+(\.\d+)?\b/ },
    // 5. Operators
    { className: 'operator', begin: /[\+\-\*\/=<>&|!?:]+/ },
    // 6. Strings
    { className: 'string', begin: /'[^']*'/ },
    // 7. Comments
    { className: 'comment', begin: /\/\/.*/ } 
  ]
}));

// --- C. Bedrock JSON & JSON UI (Auto-detect & Molang Injection) ---
hljs.registerLanguage('json-molang', (hljs) => ({
  name: 'Bedrock JSON',
  aliases: ['json', 'bedrock', 'jsonui', 'ui'],
  contains: [
    // Keys (Standard JSON keys)
    {
      className: 'attr',
      begin: /"(\\[\\"\"]|[^\\\"\n])*"(?=\s*:)/,
    },
    // Keys (JSON UI Special Keys - highlighted differently if theme supports)
    {
        className: 'keyword',
        begin: /"(type|controls|bindings|visible|texture|offset|size|layer|alpha|anchor_from|anchor_to|text|font_type|font_scale|color|ignored|variables|modifications)"(?=\s*:)/
    },
    // Values
    {
      className: 'string',
      begin: /"/, end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        // Inject Molang highlighting inside JSON strings
        {
          subLanguage: 'molang',
          begin: /[^\"]+/,
          // Only trigger if it looks like Molang (contains math/query/variable or operators)
          relevance: 0 
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
// 2. 智能代码块组件 (Smart Code Block)
// ==========================================
interface CodeBlockProps {
  language: string;
  code: string;
}

const MacCodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [formattedCode, setFormattedCode] = useState(code);
  const [detectedLang, setDetectedLang] = useState('plaintext');
  const [highlightedHtml, setHighlightedHtml] = useState('');

  // Normalize language names
  const normalizeLang = (lang: string) => {
    const lower = lang?.toLowerCase() || '';
    const map: Record<string, string> = {
        'js': 'javascript',
        'ts': 'typescript',
        'json': 'json-molang', // Force custom JSON handler
        'jsonui': 'json-molang',
        'mc': 'mcfunction',
        'mo': 'molang'
    };
    return map[lower] || lower || 'plaintext';
  };

  // Display Label Mapping
  const getDisplayLabel = (lang: string) => {
    const map: Record<string, string> = {
      'mcfunction': 'McFunction',
      'molang': 'Molang',
      'json-molang': 'JSON',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'cpp': 'C++',
      'plaintext': 'Text',
      'html': 'HTML',
      'css': 'CSS',
      'python': 'Python'
    };
    return map[lang] || lang.toUpperCase();
  };

  useEffect(() => {
    let finalLang = normalizeLang(language);
    let codeToRender = code;

    // 1. Auto Format (IDE Standard)
    // Only auto-format JSON/JSON-Molang for now as it's the safest to do on client-side
    // without heavy parsers.
    if (finalLang === 'json-molang') {
        try {
            // Check if it looks like a minified object or array
            if ((code.startsWith('{') || code.startsWith('[')) && !code.includes('\n')) {
                const parsed = JSON.parse(code);
                codeToRender = JSON.stringify(parsed, null, 2);
            }
        } catch (e) {
            // If parse fails (e.g. comments in JSON), render as is
        }
    }

    // 2. Intelligent Auto-detection fallback
    if (finalLang === 'plaintext') {
        const auto = hljs.highlightAuto(codeToRender);
        if (auto.language) {
            // Prefer our custom definitions
            if (auto.language === 'json') finalLang = 'json-molang';
            else finalLang = auto.language;
        }
    }

    setFormattedCode(codeToRender);
    setDetectedLang(finalLang);

    // 3. Highlight
    try {
        if (hljs.getLanguage(finalLang)) {
            setHighlightedHtml(hljs.highlight(codeToRender, { language: finalLang }).value);
        } else {
            setHighlightedHtml(hljs.highlightAuto(codeToRender).value);
        }
    } catch (e) {
        setHighlightedHtml(hljs.highlightAuto(codeToRender).value);
    }

  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-5 rounded-xl overflow-hidden bg-[#1e2024] border border-[#333] shadow-xl">
      {/* Mac Window Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#333]">
        {/* Left: Mac Dots */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" /> 
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" /> 
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" /> 
        </div>
        
        {/* Right: Language & Copy */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-medium text-[#666] group-hover:text-[#999] transition-colors select-none">
            {getDisplayLabel(detectedLang)}
          </span>
          <div className="w-[1px] h-3 bg-[#444]"></div>
          <button 
            onClick={handleCopy}
            className="flex items-center justify-center text-[#666] hover:text-[#fff] transition-colors"
            title="Copy"
          >
            <span className="material-symbols-rounded text-sm">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>
      </div>
      
      {/* Code Area */}
      <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
        <pre className="p-4 m-0">
          <code 
            className={`font-mono text-[13px] leading-relaxed whitespace-pre language-${detectedLang}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// 3. 核心渲染器 (Unicode IDS Engine & Zaozi)
// ==========================================

// --- IDS Constants & Types ---
// Unicode IDS Characters (U+2FF0 - U+2FFB)
const IDS = {
  LR: '⿰',   // Left-Right
  TB: '⿱',   // Top-Bottom
  LMR: '⿲',  // Left-Middle-Right
  TMB: '⿳',  // Top-Middle-Bottom
  FULL: '⿴', // Full Enclosure
  TOP: '⿵',  // Top Enclosure
  BTM: '⿶',  // Bottom Enclosure
  LEFT: '⿷', // Left Enclosure
  TL: '⿸',   // Top-Left Enclosure
  TR: '⿹',   // Top-Right Enclosure
  BL: '⿺',   // Bottom-Left Enclosure
  OVER: '⿻'  // Overlaid
} as const;

type IDS_OP = typeof IDS[keyof typeof IDS];

// Radical Mappings: Context-sensitive Glyphs
// Key: Character -> Value: { Position: Replacement }
const RADICAL_MAP: Record<string, Record<string, string>> = {
  '水': { 'L': '氵', 'B': '氺' },
  '火': { 'L': '火', 'B': '灬' },
  '人': { 'L': '亻', 'T': '𠆢' },
  '心': { 'L': '忄', 'B': '⺗' },
  '手': { 'L': '扌' },
  '言': { 'L': '讠' },
  '金': { 'L': '钅' },
  '食': { 'L': '饣' },
  '衣': { 'L': '衤' },
  '示': { 'L': '礻' },
  '肉': { 'L': '月' }, // Standard replacement in characters
  '王': { 'L': '𤣩' }, // Jade radical
  '足': { 'L': '⻊' },
  '竹': { 'T': '⺮' },
  '草': { 'T': '艹' },
  '网': { 'T': '⺫' },
  '刀': { 'R': '刂' },
  '犬': { 'L': '犭' },
  '羊': { 'T': '⺶' }
};

// Enclosure Inference Map (for smart '+' syntax)
const ENCLOSURE_MAP: Record<string, IDS_OP> = {
  '囗': IDS.FULL,
  '门': IDS.TOP, '冂': IDS.TOP, '冖': IDS.TOP, '宀': IDS.TOP,
  '凵': IDS.BTM,
  '匚': IDS.LEFT,
  '疒': IDS.TL, '尸': IDS.TL, '广': IDS.TL, '厂': IDS.TL, '户': IDS.TL,
  '勹': IDS.TR, '气': IDS.TR,
  '辶': IDS.BL, '走': IDS.BL, '廴': IDS.BL
};

interface IDSNode {
  op?: IDS_OP;
  parts?: IDSNode[];
  char?: string;
}

// --- A. Smart Parsing Engine ---
const parseZaoziString = (desc: string): IDSNode => {
  desc = desc.trim();

  // 1. Explicit IDS Format or Bracket Format handling
  // If user enters actual IDS chars, we should parse them (simplified recursive parser)
  // For now, let's focus on the DSL: "op(A, B)" or "A+B"

  // Helper: Strip brackets
  const unwrap = (s: string) => s.replace(/^[\(（](.*)[\)）]$/, '$1');

  // Check for Function Syntax: "bw(A, B)" or "包围(A, B)"
  const funcMatch = desc.match(/^([^\(（]+)[\(（](.*?)[\)）]$/);
  if (funcMatch) {
    const type = funcMatch[1].trim().toLowerCase();
    const rawParts = funcMatch[2].split(/[,，]/).map(s => s.trim());
    
    // Recursive parse parts
    const parts = rawParts.map(parseZaoziString);

    let op: IDS_OP = IDS.LR;
    if (['上下', 'tb', 'sx', 'updown', '⿱'].includes(type)) op = IDS.TB;
    else if (['左中右', 'lmr', '⿲'].includes(type)) op = IDS.LMR;
    else if (['上中下', 'tmb', '⿳'].includes(type)) op = IDS.TMB;
    else if (['全包', 'bw', 'surround', 'full', '囗', '⿴'].includes(type)) op = IDS.FULL;
    else if (['左上', 'tl', '⿸'].includes(type)) op = IDS.TL;
    else if (['左下', 'bl', '⿺'].includes(type)) op = IDS.BL;
    else if (['右上', 'tr', '⿹'].includes(type)) op = IDS.TR;
    else if (['同', 'top', 'upper', '⿵'].includes(type)) op = IDS.TOP;
    
    return { op, parts };
  }

  // Check for '+' Syntax
  if (desc.includes('+')) {
    const rawParts = desc.split('+').map(s => s.trim());
    const parts = rawParts.map(s => ({ char: s })); // Leaves for now
    
    // Smart Inference
    if (parts.length === 2) {
      const p1 = parts[0].char || '';
      // Check if P1 is an enclosure root
      if (ENCLOSURE_MAP[p1]) {
        return { op: ENCLOSURE_MAP[p1], parts };
      }
      // Default to LR
      return { op: IDS.LR, parts };
    } 
    
    if (parts.length === 3) {
        // Assume Left-Middle-Right if 3 parts
        return { op: IDS.LMR, parts };
    }
  }

  // Fallback: Single Char
  return { char: desc };
};

// --- B. Recursive Renderer ---
const renderIDSNode = (node: IDSNode, context: 'L' | 'R' | 'T' | 'B' | 'M' | 'None' = 'None'): string => {
  if (node.char) {
    // 1. Radical Substitution
    let displayChar = node.char;
    const variants = RADICAL_MAP[node.char];
    if (variants && variants[context]) {
      displayChar = variants[context];
    }

    // 2. Visual Tweaks for specific contexts (CSS Transforms)
    // Even if no unicode variant exists, we might want to squeeze it.
    let transform = "";
    if (context === 'L') transform = "scaleX(0.9) origin-left"; 
    else if (context === 'R') transform = "scaleX(0.9) origin-right";
    else if (context === 'T') transform = "scaleY(0.9) origin-top";
    else if (context === 'B') transform = "scaleY(0.9) origin-bottom";

    // 3. Leaf Node HTML
    return `<span class="flex items-center justify-center w-full h-full overflow-visible leading-none select-none text-[inherit]" 
              style="${transform ? `transform: ${transform};` : ''}">
              ${displayChar}
            </span>`;
  }

  if (!node.parts || node.parts.length === 0) return '';
  const op = node.op || IDS.LR;

  // Render Strategy based on Operator
  const p1 = node.parts[0];
  const p2 = node.parts[1];
  const p3 = node.parts[2];

  // Common Container
  const container = (inner: string, extraClass: string = '') => 
    `<span class="inline-flex relative w-full h-full ${extraClass}">${inner}</span>`;

  // --- Binary Structures ---
  if (op === IDS.LR) {
    return container(
      `<div class="flex-1 h-full flex items-center justify-center overflow-hidden">${renderIDSNode(p1, 'L')}</div>
       <div class="flex-1 h-full flex items-center justify-center overflow-hidden">${renderIDSNode(p2, 'R')}</div>`,
      'flex-row'
    );
  }
  if (op === IDS.TB) {
    return container(
      `<div class="flex-1 w-full flex items-center justify-center overflow-hidden">${renderIDSNode(p1, 'T')}</div>
       <div class="flex-1 w-full flex items-center justify-center overflow-hidden">${renderIDSNode(p2, 'B')}</div>`,
      'flex-col'
    );
  }

  // --- Ternary Structures ---
  if (op === IDS.LMR) {
    return container(
      `<div class="flex-1 h-full flex items-center justify-center">${renderIDSNode(p1, 'L')}</div>
       <div class="flex-1 h-full flex items-center justify-center">${renderIDSNode(p2, 'M')}</div>
       <div class="flex-1 h-full flex items-center justify-center">${renderIDSNode(p3 || p2, 'R')}</div>`,
      'flex-row'
    );
  }
  if (op === IDS.TMB) {
    return container(
      `<div class="flex-1 w-full flex items-center justify-center">${renderIDSNode(p1, 'T')}</div>
       <div class="flex-1 w-full flex items-center justify-center">${renderIDSNode(p2, 'M')}</div>
       <div class="flex-1 w-full flex items-center justify-center">${renderIDSNode(p3 || p2, 'B')}</div>`,
      'flex-col'
    );
  }

  // --- Enclosure Structures (The Hard Part) ---
  // Using Absolute Positioning for precision overlay
  
  // Helper: Layer (z-index)
  // Outer frame usually needs to be behind if it's full, or handled carefully. 
  // Actually standard fonts usually have the enclosure "hollow".
  
  // 1. Full Enclosure (⿴) - Outer fills, Inner centered small
  if (op === IDS.FULL) {
    return container(
      `<div class="absolute inset-0 z-0 flex items-center justify-center scale-[1.1]">${renderIDSNode(p1, 'None')}</div>
       <div class="absolute inset-0 z-10 flex items-center justify-center scale-[0.6]">${renderIDSNode(p2, 'None')}</div>`
    );
  }

  // 2. Top-Left Enclosure (⿸) - e.g., 疒. Outer Top-Left, Inner Bottom-Right
  if (op === IDS.TL) {
    return container(
      `<div class="absolute inset-0 z-0 flex items-start justify-start pl-[0.1em] pt-[0.1em] scale-[1.1] origin-top-left">${renderIDSNode(p1, 'None')}</div>
       <div class="absolute inset-0 z-10 flex items-end justify-end pr-[0.1em] pb-[0.1em] scale-[0.7] origin-bottom-right">${renderIDSNode(p2, 'None')}</div>`
    );
  }

  // 3. Top-Right Enclosure (⿹) - e.g., 气. Outer Top-Right, Inner Bottom-Left
  if (op === IDS.TR) {
    return container(
      `<div class="absolute inset-0 z-0 flex items-start justify-end pr-[0.1em] pt-[0.1em] scale-[1.1] origin-top-right">${renderIDSNode(p1, 'None')}</div>
       <div class="absolute inset-0 z-10 flex items-end justify-start pl-[0.1em] pb-[0.1em] scale-[0.7] origin-bottom-left">${renderIDSNode(p2, 'None')}</div>`
    );
  }
  
  // 4. Bottom-Left Enclosure (⿺) - e.g., 辶. Outer Bottom-Left, Inner Top-Right
  if (op === IDS.BL) {
    return container(
      `<div class="absolute inset-0 z-0 flex items-end justify-start pl-[0.1em] pb-[0.1em] scale-[1.1] origin-bottom-left">${renderIDSNode(p1, 'None')}</div>
       <div class="absolute inset-0 z-10 flex items-start justify-end pr-[0.1em] pt-[0.1em] scale-[0.65] origin-top-right translate-x-[-0.1em] translate-y-[0.1em]">${renderIDSNode(p2, 'None')}</div>`
    );
  }

  // 5. Top Enclosure (⿵) - Outer Top, Inner Bottom
  if (op === IDS.TOP) {
      return container(
      `<div class="absolute inset-0 z-0 flex items-start justify-center pt-[0.05em] scale-[1.1] origin-top">${renderIDSNode(p1, 'T')}</div>
       <div class="absolute inset-0 z-10 flex items-end justify-center pb-[0.1em] scale-[0.7] origin-bottom">${renderIDSNode(p2, 'B')}</div>`
      );
  }

  // 6. Bottom Enclosure (⿶)
  if (op === IDS.BTM) {
    return container(
    `<div class="absolute inset-0 z-0 flex items-end justify-center pb-[0.05em] scale-[1.1] origin-bottom">${renderIDSNode(p1, 'B')}</div>
     <div class="absolute inset-0 z-10 flex items-start justify-center pt-[0.1em] scale-[0.7] origin-top">${renderIDSNode(p2, 'T')}</div>`
    );
  }

  // 7. Left Enclosure (⿷)
  if (op === IDS.LEFT) {
    return container(
    `<div class="absolute inset-0 z-0 flex items-center justify-start pl-[0.05em] scale-[1.1] origin-left">${renderIDSNode(p1, 'L')}</div>
     <div class="absolute inset-0 z-10 flex items-center justify-end pr-[0.1em] scale-[0.6] origin-right">${renderIDSNode(p2, 'R')}</div>`
    );
  }

  // Fallback
  return renderIDSNode(p1);
};


// --- C. Top Level Generator ---
const generateZaoziHtml = (desc: string) => {
  try {
    const rootNode = parseZaoziString(desc);
    const innerHtml = renderIDSNode(rootNode);
    // Global Wrapper: 1em x 1em, sitting on baseline
    return `<span class="inline-block w-[1.1em] h-[1.1em] align-text-bottom mx-[1px] leading-none select-none relative top-[1px] text-[#E0E0E0] font-serif bg-transparent">
        ${innerHtml}
    </span>`;
  } catch (e) {
    return `<span class="text-red-400">[造字失败:${desc}]</span>`;
  }
};


export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  
  // 1. Registry Build Phase (Parsed once per content change)
  const zaoziRegistry = useMemo(() => {
    const registry: Record<string, string> = {};
    const regex = /\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9]+)\s*[|｜]\s*(.*?)\]/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const pinyin = match[1];
      const desc = match[2];
      registry[pinyin] = generateZaoziHtml(desc);
    }
    return registry;
  }, [content]);

  const renderInline = (text: string) => {
    let res = text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      // 1. Inline Code
      .replace(/`([^`]+)`/g, '<code class="bg-[#2D2D2D] text-[#A5C9A1] px-1.5 py-0.5 rounded text-sm font-mono border border-[#444] mx-1">$1</code>')
      // 2. Images
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full shadow-lg border border-[#333]"/>')
      // 3. Formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#E6E6E6] font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-[#B0B0B0] font-serif">$1</em>')
      .replace(/~~(.*?)~~/g, '<del class="text-[#666] decoration-1">$1</del>')
      // 4. Custom Font (Simplified & Non-conflicting)
      .replace(/%%(.*?)\|(.*?)%%/g, '<span style="font-family: \'$1\', sans-serif;">$2</span>')
      // 5. Zaozi (Definition - Hidden)
      .replace(/\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9]+)\s*[|｜]\s*(.*?)\]/gi, '') 
      // 6. Zaozi (Usage)
      .replace(/:([a-zA-Z0-9]+):/g, (match, pinyin) => {
         return zaoziRegistry[pinyin] || match; 
      })
      // 7. Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#4D9EFF] hover:underline decoration-2 underline-offset-2 break-all">$1</a>');
      
    return res;
  };

  const elements = [];
  const regex = /(```(\w+)?\s*[\s\S]*?```|<(?:video|iframe)[\s\S]*?(?:<\/(?:video|iframe)>|\/>))/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index);
      if (textPart.trim()) {
        elements.push(<div key={`text-${lastIndex}`} className="prose-part">{renderTextBlocks(textPart, renderInline)}</div>);
      }
    }

    const block = match[0];
    if (block.startsWith('```')) {
      const codeMatch = block.match(/```(\w+)?\s*([\s\S]*?)```/);
      if (codeMatch) {
        elements.push(
          <MacCodeBlock 
            key={`code-${match.index}`} 
            language={codeMatch[1] || ''} 
            code={codeMatch[2].trim()} 
          />
        );
      }
    } else {
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
    const textPart = content.slice(lastIndex);
    if (textPart.trim()) {
      elements.push(<div key={`text-end-${lastIndex}`} className="prose-part">{renderTextBlocks(textPart, renderInline)}</div>);
    }
  }

  return <div className="space-y-1 text-[#C7C7CC]">{elements}</div>;
};

// Helper: Text Block Rendering
const renderTextBlocks = (text: string, inlineParser: (s: string) => string) => {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2" />;
    
    if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold text-[#FFFFFF] mt-8 mb-4 pb-2 border-b border-[#333]" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />;
    if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-2xl font-semibold text-[#EEEEEE] mt-6 mb-3" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(3))}} />;
    if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-xl font-medium text-[#DDDDDD] mt-4 mb-2" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(4))}} />;
    
    if (trimmed.startsWith('> ')) {
      return <blockquote key={idx} className="border-l-4 border-[#555] bg-[#333]/30 pl-4 py-2 my-2 rounded-r italic text-[#CCC]"><span dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></blockquote>;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
       return <div key={idx} className="flex gap-2 ml-2 my-1"><span className="text-[#888] font-bold">•</span><span className="flex-1 break-words leading-7" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></div>;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
        return <div key={idx} className="flex gap-2 ml-2 my-1"><span className="text-[#888] font-mono font-bold">{orderedMatch[1]}.</span><span className="flex-1 break-words leading-7" dangerouslySetInnerHTML={{__html: inlineParser(orderedMatch[2])}} /></div>;
    }

    return <p key={idx} className="leading-7 mb-2 break-words text-justify" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{__html: inlineParser(trimmed)}} />;
  });
};
