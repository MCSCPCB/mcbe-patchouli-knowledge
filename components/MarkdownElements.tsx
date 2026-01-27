
import React, { useState, useEffect, useMemo } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

// ==========================================
// 1. Minecraft 深度语法支持 (Ultimate)
// ==========================================

// --- Shared Molang Rules (Refined) ---
const MOLANG_RULES = [
  // Strings
  { className: 'string', begin: /'/, end: /'/, contains: [hljs.BACKSLASH_ESCAPE] },
  // Numbers
  { className: 'number', begin: /\b\d+(\.\d+)?\b/ },
  // Control Flow Keywords
  { className: 'keyword', begin: /\b(return|loop|for_each|break|continue|this)\b/ },
  // Namespaces (query, math, variable...) - Cyan/Blue
  { 
    className: 'built_in', 
    begin: /\b(query|math|variable|texture|temp|geometry|material|array|context|c|q|v|t)(?=\.)/ 
  },
  // Properties (The part after the dot) - Red/Pink
  { 
    className: 'property', 
    begin: /\.[a-zA-Z0-9_]+/,
    excludeBegin: true
  },
  // Operators
  { className: 'operator', begin: /[\+\-\*\/=<>&|!?:]+/ },
  // Punctuation
  { className: 'punctuation', begin: /[\(\)\{\}\[\],;]/ },
  // Catch-all for other variables/temps
  { className: 'variable', begin: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/ }
];

// --- A. Minecraft Commands (McFunction) ---
hljs.registerLanguage('mcfunction', (hljs) => ({
  name: 'Minecraft Commands',
  aliases: ['mc', 'minecraft', 'cmd', 'mcfunction'],
  case_insensitive: true,
  contains: [
    hljs.HASH_COMMENT_MODE,
    { 
      // Main Commands (Ultimate Collection)
      className: 'keyword', 
      begin: /^\s*\/?\b(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule|tag|team|bossbar|effect|enchant|experience|fill|fillbiome|gamemode|gamerule|help|item|kick|list|locate|loot|msg|particle|place|playsound|publish|reload|ride|save-all|save-off|save-on|seed|setblock|setidletimeout|setworldspawn|spawnpoint|spectate|spreadplayers|stop|stopsound|teammsg|time|tm|trigger|w|weather|worldborder|xp|damage|inputpermission|jfr|perf|camera|dialogue|event|fog|mobevent|music|playanimation|structure|tickingarea|volumearea|return|transfer|random)\b/ 
    },
    { 
      // Subcommands & Keywords
      className: 'literal', 
      begin: /\b(run|as|at|align|anchored|if|unless|store|result|success|matches|facing|rotated|positioned|in|dimension|type|name|tags|scores|level|distance|x|y|z|dx|dy|dz|limit|sort|gamemode|nbt|true|false|on|origin|replace|keep|destroy|outline|hollow|all|entity|block|storage|nearest|random|player|self)\b/ 
    },
    { 
      // Target Selectors (e.g. @a[type=cow])
      className: 'variable', 
      begin: /@[aeprs]/,
      contains: [
        {
          begin: /\[/, end: /\]/,
          contains: [
            { className: 'attr', begin: /[a-z0-9_]+(?==)/ }, // Selector Keys (type=)
            { className: 'punctuation', begin: /=/ },
            { className: 'string', begin: /!?[a-zA-Z0-9_.:-]+/ }, // Selector Values
            { className: 'punctuation', begin: /,/ }
          ]
        }
      ]
    }, 
    { 
      // Resource Locations (e.g. minecraft:apple)
      className: 'symbol', 
      begin: /\b[a-z0-9_.-]+:[a-z0-9_./-]+\b/ 
    }, 
    { 
      // Coordinates (~ ~1 ^)
      className: 'number', 
      begin: /[~^](-?\d+(\.\d+)?)?|\b-?\d+(\.\d+)?[bdfilsw]?\b/ 
    }, 
    { 
      // JSON Strings
      className: 'string', 
      begin: /"/, end: /"/,
      contains: [hljs.BACKSLASH_ESCAPE]
    },
    // NBT Stubs (Simplified)
    { className: 'punctuation', begin: /[\{\}\[\]]/ }
  ]
}));

// --- B. Minecraft Molang (Standalone) ---
hljs.registerLanguage('molang', (hljs) => ({
  name: 'Molang',
  aliases: ['mo', 'bedrock-script'],
  case_insensitive: true,
  contains: [
    hljs.C_NUMBER_MODE,
    ...MOLANG_RULES
  ]
}));

// --- C. Bedrock JSON (Extreme Highlighting) ---
hljs.registerLanguage('json-bedrock', (hljs) => ({
  name: 'Bedrock JSON',
  aliases: ['json', 'bedrock', 'jsonui', 'ui'],
  contains: [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    
    // 1. Top Level & Structural Keys (Purple/Magenta)
    // Added: geometry, textures, materials, identifier
    {
      className: 'keyword', 
      begin: /"(format_version|minecraft:[a-z0-9_.-]+|components|description|events|component_groups|states|permutations|bones|cubes|locators|poly_mesh|physics|texture_meshes|scripts|render_controllers|animations|animation_controllers|geometry|textures|materials|identifier|identifiers)"(?=\s*:)/
    },
    
    // 2. UI & Functional Keys (Blue/Cyan - via 'built_in')
    {
      className: 'built_in',
      begin: /"(type|controls|bindings|visible|texture|offset|size|layer|alpha|anchor_from|anchor_to|text|font_type|font_scale|color|ignored|variables|modifications|on_entry|on_exit|on_event|anims|transitions)"(?=\s*:)/
    },
    
    // 3. Standard Keys (Red/Orange - via 'attr')
    // Correctly handles escaped quotes inside keys
    {
      className: 'attr', 
      begin: /"(?:[^\\"\n]|\\.)*"(?=\s*:)/,
    },
    
    // 4. Resource Location Values (Cyan - via 'symbol')
    // Supports custom namespaces (e.g. "sny:default")
    {
        className: 'symbol',
        begin: /"[a-z0-9_.-]+:[a-z0-9_./-]+"/
    },
    
    // 5. Values with Molang Injection
    {
      className: 'string',
      begin: /"/, end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        // Detect Molang Patterns inside strings (e.g. "t.anim = ...")
        {
          subLanguage: 'molang',
          begin: /\b(query|math|variable|t|c|q|v)\./,
          end: /"/, // Stop at the closing quote of the string
          returnEnd: true, 
          excludeEnd: true
        }
      ]
    },
    
    hljs.C_NUMBER_MODE,
    { className: 'literal', begin: /\b(true|false|null)\b/ },
    { className: 'punctuation', begin: /[\{\[\}\],:]/ }
  ]
}));

// --- D. Lang File (Enhanced) ---
hljs.registerLanguage('lang', (hljs) => ({
  name: 'Minecraft Lang',
  aliases: ['lang', 'properties'],
  contains: [
    hljs.COMMENT(/#/, /$/),
    { className: 'variable', begin: /^[a-zA-Z0-9_.-]+(?==)/ },
    { 
      className: 'string', 
      begin: /=/, end: /$/, 
      excludeBegin: true,
      contains: [
        // Color Codes (§a)
        { className: 'meta', begin: /§[0-9a-fk-or]/ } 
      ]
    }
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

  const normalizeLang = (lang: string) => {
    const lower = lang?.toLowerCase() || '';
    const map: Record<string, string> = {
        'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript',
        'json': 'json-bedrock', 'jsonui': 'json-bedrock',
        'mc': 'mcfunction', 'cmd': 'mcfunction',
        'mo': 'molang', 'molang': 'molang',
        'lang': 'lang'
    };
    return map[lower] || lower || 'plaintext';
  };

  const getDisplayLabel = (lang: string) => {
    const map: Record<string, string> = {
      'mcfunction': 'McFunction',
      'molang': 'Molang',
      'json-bedrock': 'JSON',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'lang': 'Lang',
      'plaintext': 'Text',
    };
    return map[lang] || lang.toUpperCase();
  };

  // Improved Detection Logic
  const detectLanguage = (codeSnippet: string) => {
    // 0. Clean comments (inline // or block /* */) from start to identify structure
    // This allows detecting JSON that starts with a comment header
    const clean = codeSnippet.replace(/^(\s*(\/\/.*|\/\*[\s\S]*?\*\/))*/, '').trim();
    
    // 1. JSON (Block OR Snippet like "key": value)
    if (clean.startsWith('{') || clean.startsWith('[')) return 'json-bedrock';
    if (/^"(?:[^"\\]|\\.)*"\s*:/.test(clean)) return 'json-bedrock';
    
    // 2. JS/TS (Keywords)
    if (/\b(const|let|var|function|import|export|return|class|interface|=>)\b/.test(codeSnippet)) {
        if (codeSnippet.includes('interface') || codeSnippet.includes('type ')) return 'typescript';
        return 'javascript';
    }

    // 3. McFunction (Expanded Commands)
    if (/^\s*\/?(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule|tag|team|bossbar|effect|enchant|experience|fill|fillbiome|gamemode|gamerule|help|item|kick|list|locate|loot|msg|particle|place|playsound|publish|reload|ride|save-all|save-off|save-on|seed|setblock|setidletimeout|setworldspawn|spawnpoint|spectate|spreadplayers|stop|stopsound|teammsg|time|tm|trigger|w|weather|worldborder|xp|damage|inputpermission|jfr|perf|camera|dialogue|event|fog|mobevent|music|playanimation|structure|tickingarea|volumearea|return|transfer|random)\b/m.test(codeSnippet)) return 'mcfunction';
    
    // 4. Molang (STRICT)
    // Only detect if it matches Molang keywords AND isn't identified as JSON
    if (/\b(query|math|variable|geometry|texture)\.[a-zA-Z0-9_]+/.test(codeSnippet)) return 'molang';
    if (codeSnippet.includes('v.') || codeSnippet.includes('q.') || codeSnippet.includes('t.')) {
        if (codeSnippet.includes('?') && codeSnippet.includes(':')) return 'molang';
    }
    
    // 5. Lang File
    if (/^[\w\.]+=[^\n]+$/m.test(codeSnippet) && !codeSnippet.includes(';') && !codeSnippet.includes('{')) return 'lang';

    return null;
  };

  useEffect(() => {
    let finalLang = normalizeLang(language);
    let codeToRender = code;

    // Auto Format JSON
    if (finalLang === 'json-bedrock') {
        try {
            // Only auto-format if it looks like a minified or raw JSON object block
            const clean = code.replace(/^(\s*(\/\/.*|\/\*[\s\S]*?\*\/))*/, '').trim();
            if ((clean.startsWith('{') || clean.startsWith('[')) && !code.includes('\n')) {
                const parsed = JSON.parse(code); // parse original code (assuming comments are valid in Bedrock but maybe not for JSON.parse)
                // Note: Standard JSON.parse fails on comments. 
                // We leave it as is if it fails, assuming user wants raw view.
                codeToRender = JSON.stringify(parsed, null, 2);
            }
        } catch (e) { /* ignore */ }
    }

    // Auto-detection
    if (finalLang === 'plaintext') {
        const heuristic = detectLanguage(codeToRender);
        if (heuristic) {
            finalLang = heuristic;
        } else {
            const auto = hljs.highlightAuto(codeToRender);
            if (auto.language && auto.language !== 'molang') { 
                if (auto.language === 'json') finalLang = 'json-bedrock';
                else finalLang = auto.language;
            }
        }
    }

    setFormattedCode(codeToRender);
    setDetectedLang(finalLang);

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
    // Mac Style - Bluish Dark Theme
    <div className="relative group my-5 rounded-xl overflow-hidden bg-[#23272e] border border-[#3b4252] shadow-2xl font-sans">
      <div className="flex items-center justify-between px-4 py-3 bg-[#282c34] border-b border-[#3b4252]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" /> 
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" /> 
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" /> 
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-mono text-[#abb2bf] group-hover:text-[#fff] transition-colors select-none font-medium">
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
              color: '#abb2bf',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)' 
            }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};

// ==========================================
// 3. 核心渲染器 (Ultra Enhanced IDS Renderer)
// ==========================================

// --- A. 布局配置与智能判读常量 ---

// 1. 窄偏旁集合：当这些字出现在【左侧】时，宽度应自动收缩 (占比 ~35%)
const NARROW_RADICALS = new Set([
  '亻', '讠', '扌', '氵', '忄', '犭', '礻', '衤', '⻊', '钅', 
  '弓', '孑', '纟', '彳', '贝', '月', '舟', '车', '方', '火',
  '子', '女', '马', '身', '歹', '⺦', '爿', '片', '韦', '牙', '牛', '手', '气', '士', '王'
]);

// 2. 扁偏旁集合：当这些字出现在【上方】时，高度应自动收缩 (占比 ~35%)
const FLAT_RADICALS = new Set([
  '艹', '⺮', '宀', '冖', '穴', '雨', '罒', '爫', '⺌', '⺍', '人', '八', '⺈', '⺊', '耂'
]);

// 3. IDS 操作符配置
interface IDSLayoutConfig {
  arity: 2 | 3;
}

const IDS_CONFIG: Record<string, IDSLayoutConfig> = {
  // 二元
  '⿰': { arity: 2 }, // 左右
  '⿱': { arity: 2 }, // 上下
  '⿵': { arity: 2 }, // 上三包
  '⿶': { arity: 2 }, // 下三包
  '⿷': { arity: 2 }, // 左三包
  '⿸': { arity: 2 }, // 左上包
  '⿹': { arity: 2 }, // 右上包
  '⿺': { arity: 2 }, // 左下包
  '⿻': { arity: 2 }, // 镶嵌
  '⿴': { arity: 2 }, // 全包
  // 三元
  '⿲': { arity: 3 }, // 左中右
  '⿳': { arity: 3 }, // 上中下
};

// --- B. 智能字典 (Smart Radical Logic) ---
const RADICAL_MAPPING: Record<string, string> = {
  // 1. 强包围
  '囗': '⿴', '回': '⿴', '围': '⿴',
  '门': '⿵', '冂': '⿵', '同': '⿵', '风': '⿵',
  '凵': '⿶', '凶': '⿶',
  '匚': '⿷', '区': '⿷',
  '广': '⿸', '疒': '⿸', '尸': '⿸', '户': '⿸', '麻': '⿸', '厂': '⿸',
  '气': '⿹', '弋': '⿹',
  '辶': '⿺', '走': '⿺', '廴': '⿺',
  // 2. 强上方 -> 上下
  '艹': '⿱', '竹': '⿱', '宀': '⿱', '冖': '⿱', '穴': '⿱', '雨': '⿱', '人': '⿱',
  // 3. 强左方 -> 左右
  '亻': '⿰', '讠': '⿰', '扌': '⿰', '氵': '⿰', '忄': '⿰', '犭': '⿰', 
  '礻': '⿰', '衤': '⿰', '木': '⿰', '禾': '⿰', '火': '⿰', '土': '⿰', 
  '金': '⿰', '王': '⿰', '月': '⿰', '日': '⿰', '口': '⿰', '虫': '⿰', 
  '足': '⿰', '⻊': '⿰', '车': '⿰', '舟': '⿰', '方': '⿰', '女': '⿰'
};

const RIGHT_MARKERS = new Set(['刂', '阝', '卩', 'lz', '欠', '页', '隹', '斤', '见']);
const BOTTOM_MARKERS = new Set(['心', '灬', '皿', '儿', '贝']);

// --- C. AST 解析与转换逻辑 ---

// 1. 输入字符串 -> 标准 IDS 前缀表达式
const convertSimpleToIDS = (input: string): string => {
  const desc = input.trim();
  if (!desc) return '?';

  if (IDS_CONFIG[desc[0]]) return desc; // 专业模式直接返回

  let cleanDesc = desc;
  if (desc.length > 2 && !desc.match(/[+/(),]/)) {
      cleanDesc = desc.replace(/字(头|框|底|旁|儿)/g, '').trim();
  }

  // 函数语法检测
  const funcMatch = cleanDesc.match(/^([^\(（]+)[\(（](.*?)[\,，]?(.*?)[\)）]$/);
  if (funcMatch) {
    const op = funcMatch[1].trim();
    const p1 = funcMatch[2].trim();
    const p2 = funcMatch[3].trim();
    if (/^(左右|lr)$/i.test(op)) return `⿰${p1}${p2}`;
    if (/^(上下|tb)$/i.test(op)) return `⿱${p1}${p2}`;
    if (/^(全包|围|回|full)$/i.test(op) || op.includes('框')) return `⿴${p1}${p2}`;
    if (/^(上三|门|同)$/i.test(op)) return `⿵${p1}${p2}`;
    if (/^(下三|凶)$/i.test(op)) return `⿶${p1}${p2}`;
    if (/^(左三|匚)$/i.test(op)) return `⿷${p1}${p2}`;
    if (/^(左上|广|病)$/i.test(op)) return `⿸${p1}${p2}`;
    if (/^(右上|气)$/i.test(op)) return `⿹${p1}${p2}`;
    if (/^(左下|辶|走)$/i.test(op)) return `⿺${p1}${p2}`;
    if (/^(镶|嵌|overlay)$/i.test(op)) return `⿻${p1}${p2}`;
  }

  // 简单操作符
  if (cleanDesc.includes('+')) return `⿰${cleanDesc.split('+')[0]}${cleanDesc.split('+')[1]}`;
  if (cleanDesc.includes('/')) return `⿱${cleanDesc.split('/')[0]}${cleanDesc.split('/')[1]}`;

  // 智能隐式推断 (Smart Mode)
  if (cleanDesc.length === 2) {
      const c1 = cleanDesc[0];
      const c2 = cleanDesc[1];
      if (RADICAL_MAPPING[c1]) return `${RADICAL_MAPPING[c1]}${c1}${c2}`;
      if (RIGHT_MARKERS.has(c2)) return `⿰${c1}${c2}`;
      if (BOTTOM_MARKERS.has(c2)) return `⿱${c1}${c2}`;
      return `⿰${c1}${c2}`; // 默认左右
  }

  return cleanDesc;
};

// 2. AST 节点定义
interface IDSNode {
  type: 'char' | 'op';
  val: string;
  children?: IDSNode[];
}

// 3. IDS 字符串 -> AST 树
const parseIDSString = (str: string): IDSNode | null => {
  let cursor = 0;
  const parse = (): IDSNode | null => {
    if (cursor >= str.length) return null;
    const char = str[cursor++];
    const config = IDS_CONFIG[char];
    
    if (config) {
      const node: IDSNode = { type: 'op', val: char, children: [] };
      for (let i = 0; i < config.arity; i++) {
        const child = parse();
        if (child) node.children!.push(child);
        else node.children!.push({ type: 'char', val: '?' }); // 容错
      }
      return node;
    } else {
      return { type: 'char', val: char };
    }
  };
  return parse();
};

// --- D. 核心渲染 (Render AST to HTML) ---
const renderIDSNode = (node: IDSNode): string => {
  // Base Case: 字符
  if (node.type === 'char') {
    // 使用 flex 居中，leading-none 防止撑大，text-[95%] 微调大小
    return `<span class="flex items-center justify-center w-full h-full text-[95%] leading-none cursor-default font-normal" style="font-family: inherit;">${node.val}</span>`;
  }

  const { val, children } = node;
  const c = children || [];
  // 递归渲染子节点
  const p1 = c[0] ? renderIDSNode(c[0]) : '';
  const p2 = c[1] ? renderIDSNode(c[1]) : '';
  const p3 = c[2] ? renderIDSNode(c[2]) : '';

  // 基础绝对定位容器
  const baseAbs = "absolute inset-0 flex";

  // --- 1. 左右结构 (Smart Width) ---
  if (val === '⿰') {
    // 启发式布局：检查左侧是否为窄偏旁
    const isNarrow = c[0] && c[0].type === 'char' && NARROW_RADICALS.has(c[0].val);
    const leftClass = isNarrow ? "w-[35%]" : "w-1/2";
    const rightClass = isNarrow ? "w-[65%]" : "w-1/2";
    return `<span class="${baseAbs} flex-row">
      <span class="${leftClass} h-full relative">${p1}</span>
      <span class="${rightClass} h-full relative">${p2}</span>
    </span>`;
  }

  // --- 2. 上下结构 (Smart Height) ---
  if (val === '⿱') {
    // 启发式布局：检查上方是否为扁偏旁
    const isFlat = c[0] && c[0].type === 'char' && FLAT_RADICALS.has(c[0].val);
    const topClass = isFlat ? "h-[35%]" : "h-1/2";
    const bottomClass = isFlat ? "h-[65%]" : "h-1/2";
    return `<span class="${baseAbs} flex-col">
      <span class="${topClass} w-full relative">${p1}</span>
      <span class="${bottomClass} w-full relative">${p2}</span>
    </span>`;
  }

  // --- 3. 三分结构 ---
  if (val === '⿲') return `<span class="${baseAbs} flex-row"><span class="flex-1 h-full relative">${p1}</span><span class="flex-1 h-full relative">${p2}</span><span class="flex-1 h-full relative">${p3}</span></span>`;
  if (val === '⿳') return `<span class="${baseAbs} flex-col"><span class="flex-1 w-full relative">${p1}</span><span class="flex-1 w-full relative">${p2}</span><span class="flex-1 w-full relative">${p3}</span></span>`;

  // --- 4. 包围结构 (Refined Layouts) ---
  // p1 是外框/偏旁，p2 是内部内容
  
  // ⿴ 全包 (国, 回)
  if (val === '⿴') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-center justify-center scale-[1.15]">${p1}</span>
      <span class="absolute inset-[18%] flex items-center justify-center scale-[0.75]">${p2}</span>
    </span>`;
  }
  
  // ⿵ 上三包 (门, 同) - 内容靠下
  if (val === '⿵') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-start justify-center pt-[2%] scale-[1.1]">${p1}</span>
      <span class="absolute left-[20%] right-[20%] top-[35%] bottom-[5%] flex items-center justify-center scale-[0.9]">${p2}</span>
    </span>`;
  }
  
  // ⿶ 下三包 (凶, 函) - 内容靠上
  if (val === '⿶') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-center pb-[5%] scale-[1.1]">${p1}</span>
      <span class="absolute left-[20%] right-[20%] top-[5%] bottom-[35%] flex items-center justify-center scale-[0.9]">${p2}</span>
    </span>`;
  }
  
  // ⿷ 左三包 (区, 医) - 内容靠右
  if (val === '⿷') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-center justify-start pl-[5%] scale-[1.1]">${p1}</span>
      <span class="absolute left-[35%] right-[10%] top-[20%] bottom-[20%] flex items-center justify-center scale-[0.9]">${p2}</span>
    </span>`;
  }
  
  // ⿸ 左上包 (广, 病) - 内容靠右下
  if (val === '⿸') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-start justify-start scale-[1.1] origin-top-left translate-x-1 translate-y-1">${p1}</span>
      <span class="absolute right-0 bottom-0 w-[70%] h-[70%] flex items-center justify-center scale-[0.9]">${p2}</span>
    </span>`;
  }
  
  // ⿹ 右上包 (气, 氧) - 内容靠左下
  if (val === '⿹') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-start justify-end scale-[1.1] origin-top-right -translate-x-1 translate-y-1">${p1}</span>
      <span class="absolute left-0 bottom-0 w-[70%] h-[70%] flex items-center justify-center scale-[0.9]">${p2}</span>
    </span>`;
  }
  
  // ⿺ 左下包 (走, 进) - 内容靠右上
  if (val === '⿺') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-start scale-[1.1] origin-bottom-left translate-x-1 -translate-y-1">${p1}</span>
      <span class="absolute right-[5%] top-[5%] w-[65%] h-[65%] flex items-center justify-center scale-[0.9]">${p2}</span>
    </span>`;
  }
  
  // ⿻ 镶嵌 (爽) - 居中叠加
  if (val === '⿻') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-center justify-center opacity-80 z-0">${p1}</span>
      <span class="absolute inset-0 flex items-center justify-center scale-[0.8] z-10 font-bold">${p2}</span>
    </span>`;
  }

  // Fallback
  return `${p1}${p2}`;
};

// 5. 主入口
const createZaoziHTML = (rawDesc: string) => {
  try {
    const idsString = convertSimpleToIDS(rawDesc);
    const ast = parseIDSString(idsString);
    if (!ast) return rawDesc;
    
    const innerHTML = renderIDSNode(ast);
    
    // 容器样式：
    // 1. inline-flex: 像文字一样排列
    // 2. w-[1.1em] h-[1.1em]: 稍微比普通文字大一点，显示细节
    // 3. align-middle: 对齐基线
    return `<span class="zaozi-container inline-flex items-center justify-center w-[1.1em] h-[1.1em] align-middle relative mx-[1px] select-none text-inherit" title="造字：${rawDesc}" style="vertical-align: -0.2em;">
      <span class="w-full h-full relative block text-[1.1em]">
        ${innerHTML}
      </span>
    </span>`;
  } catch (e) {
    return `<span class="text-red-400 text-xs">[Error]</span>`;
  }
};


export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const zaoziRegistry = useMemo(() => {
    const registry: Record<string, string> = {};
    // 支持 [造字:key|value] 或 [zaozi:key|value]
    const regex = /\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9_\u4e00-\u9fa5]+)\s*[|｜]\s*(.*?)\]/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      registry[match[1]] = createZaoziHTML(match[2]);
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
      // 清除造字定义，防止显示在正文中
      .replace(/\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9_\u4e00-\u9fa5]+)\s*[|｜]\s*(.*?)\]/gi, '') 
      // 替换占位符 :key:
      .replace(/:([a-zA-Z0-9_\u4e00-\u9fa5]+):/g, (match, key) => zaoziRegistry[key] || match)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#61afef] hover:underline decoration-2 underline-offset-2 break-all">$1</a>');
  };

  // ... (剩余的 renderTextBlocks 和 elements 生成逻辑保持不变，或参考上一份代码)
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

// ... (renderTextBlocks 函数保持不变)
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
