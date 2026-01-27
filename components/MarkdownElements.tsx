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
  // Namespaces (query, math, variable...)
  { 
    className: 'built_in', 
    begin: /\b(query|math|variable|texture|temp|geometry|material|array|context|c|q|v|t)(?=\.)/ 
  },
  // Properties (The part after the dot)
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
      // Main Commands
      className: 'keyword', 
      begin: /^\s*\/?\b(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule|tag|team|bossbar|effect|enchant|experience|fill|fillbiome|gamemode|gamerule|help|item|kick|list|locate|loot|msg|particle|place|playsound|publish|reload|ride|save-all|save-off|save-on|seed|setblock|setidletimeout|setworldspawn|spawnpoint|spectate|spreadplayers|stop|stopsound|teammsg|time|tm|trigger|w|weather|worldborder|xp|damage|inputpermission|jfr|perf|camera|dialogue|event|fog|mobevent|music|playanimation|structure|tickingarea|volumearea|return|transfer|random)\b/ 
    },
    { 
      // Subcommands & Keywords
      className: 'literal', 
      begin: /\b(run|as|at|align|anchored|if|unless|store|result|success|matches|facing|rotated|positioned|in|dimension|type|name|tags|scores|level|distance|x|y|z|dx|dy|dz|limit|sort|gamemode|nbt|true|false|on|origin|replace|keep|destroy|outline|hollow|all|entity|block|storage|nearest|random|player|self)\b/ 
    },
    { 
      // Target Selectors
      className: 'variable', 
      begin: /@[aeprs]/,
      contains: [
        {
          begin: /\[/, end: /\]/,
          contains: [
            { className: 'attr', begin: /[a-z0-9_]+(?==)/ }, // Selector Keys
            { className: 'punctuation', begin: /=/ },
            { className: 'string', begin: /!?[a-zA-Z0-9_.:-]+/ }, // Selector Values
            { className: 'punctuation', begin: /,/ }
          ]
        }
      ]
    }, 
    { 
      // Resource Locations
      className: 'symbol', 
      begin: /\b[a-z0-9_.-]+:[a-z0-9_./-]+\b/ 
    }, 
    { 
      // Coordinates
      className: 'number', 
      begin: /[~^](-?\d+(\.\d+)?)?|\b-?\d+(\.\d+)?[bdfilsw]?\b/ 
    }, 
    { 
      // JSON Strings
      className: 'string', 
      begin: /"/, end: /"/,
      contains: [hljs.BACKSLASH_ESCAPE]
    },
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
    // 1. Top Level Keys
    {
      className: 'keyword', 
      begin: /"(format_version|minecraft:[a-z0-9_.-]+|components|description|events|component_groups|states|permutations|bones|cubes|locators|poly_mesh|physics|texture_meshes|scripts|render_controllers|animations|animation_controllers|geometry|textures|materials|identifier|identifiers)"(?=\s*:)/
    },
    // 2. UI & Functional Keys
    {
      className: 'built_in',
      begin: /"(type|controls|bindings|visible|texture|offset|size|layer|alpha|anchor_from|anchor_to|text|font_type|font_scale|color|ignored|variables|modifications|on_entry|on_exit|on_event|anims|transitions)"(?=\s*:)/
    },
    // 3. Standard Keys
    {
      className: 'attr', 
      begin: /"(?:[^\\"\n]|\\.)*"(?=\s*:)/,
    },
    // 4. Resource Location Values
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
        {
          subLanguage: 'molang',
          begin: /\b(query|math|variable|t|c|q|v)\./,
          end: /"/, 
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

// --- D. Lang File ---
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

  const detectLanguage = (codeSnippet: string) => {
    const clean = codeSnippet.replace(/^(\s*(\/\/.*|\/\*[\s\S]*?\*\/))*/, '').trim();
    if (clean.startsWith('{') || clean.startsWith('[')) return 'json-bedrock';
    if (/^"(?:[^"\\]|\\.)*"\s*:/.test(clean)) return 'json-bedrock';
    
    if (/\b(const|let|var|function|import|export|return|class|interface|=>)\b/.test(codeSnippet)) {
        if (codeSnippet.includes('interface') || codeSnippet.includes('type ')) return 'typescript';
        return 'javascript';
    }

    if (/^\s*\/?(execute|scoreboard|data|give|summon|kill|tp|teleport|say|tellraw|title|advancement|recipe|function|schedule|tag|team|bossbar|effect|enchant|experience|fill|fillbiome|gamemode|gamerule|help|item|kick|list|locate|loot|msg|particle|place|playsound|publish|reload|ride|save-all|save-off|save-on|seed|setblock|setidletimeout|setworldspawn|spawnpoint|spectate|spreadplayers|stop|stopsound|teammsg|time|tm|trigger|w|weather|worldborder|xp|damage|inputpermission|jfr|perf|camera|dialogue|event|fog|mobevent|music|playanimation|structure|tickingarea|volumearea|return|transfer|random)\b/m.test(codeSnippet)) return 'mcfunction';

    if (/\b(query|math|variable|geometry|texture)\.[a-zA-Z0-9_]+/.test(codeSnippet)) return 'molang';
    if (codeSnippet.includes('v.') || codeSnippet.includes('q.') || codeSnippet.includes('t.')) {
        if (codeSnippet.includes('?') && codeSnippet.includes(':')) return 'molang';
    }
    
    if (/^[\w\.]+=[^\n]+$/m.test(codeSnippet) && !codeSnippet.includes(';') && !codeSnippet.includes('{')) return 'lang';
    return null;
  };

  useEffect(() => {
    let finalLang = normalizeLang(language);
    let codeToRender = code;

    if (finalLang === 'json-bedrock') {
        try {
            const clean = code.replace(/^(\s*(\/\/.*|\/\*[\s\S]*?\*\/))*/, '').trim();
            if ((clean.startsWith('{') || clean.startsWith('[')) && !code.includes('\n')) {
                const parsed = JSON.parse(code);
                codeToRender = JSON.stringify(parsed, null, 2);
            }
        } catch (e) { /* ignore */ }
    }

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

// --- B. 智能字典 (Refined Radical Logic) ---
// Key: Character, Value: Implied Structure
const SMART_RADICALS: Record<string, string> = {
  // 1. 强左上包 (Canopy) -> ⿸
  '广': '⿸', '疒': '⿸', '尸': '⿸', '户': '⿸', '厂': '⿸', '麻': '⿸', '辰': '⿸', '鹿': '⿸', '虎': '⿸',
  // 2. 强右上包 -> ⿹
  '气': '⿹', '弋': '⿹', '戈': '⿹', 'book': '⿹',
  // 3. 强左下包 (Movement) -> ⿺
  '辶': '⿺', '走': '⿺', '廴': '⿺', '麦': '⿺',
  // 4. 强全包 -> ⿴
  '囗': '⿴', '回': '⿴', '围': '⿴', '圆': '⿴',
  
  // 5. 强上三包 -> ⿵
  '门': '⿵', '冂': '⿵', '同': '⿵', '风': '⿵', '几': '⿵',
  // 6. 强下三包 -> ⿶
  '凵': '⿶', '凶': '⿶', '击': '⿶', '函': '⿶',
  // 7. 强左三包 -> ⿷
  '匚': '⿷', '区': '⿷', '匠': '⿷', '匣': '⿷',
  
  // 8. 强上方 (Top) -> ⿱
  '艹': '⿱', '竹': '⿱', '宀': '⿱', '冖': '⿱', '穴': '⿱', '雨': '⿱', '人': '⿱', '爪': '⿱', '爫': '⿱',
  '山': '⿱', '士': '⿱', '夂': '⿱', '癶': '⿱',
  
  // 9. 强左方 (Left) -> ⿰
  '亻': '⿰', '讠': '⿰', '扌': '⿰', '氵': '⿰', '忄': '⿰', '犭': '⿰', 
  '礻': '⿰', '衤': '⿰', '木': '⿰', '禾': '⿰', '火': '⿰', '土': '⿰', 
  '金': '⿰', '王': '⿰', '月': '⿰', '日': '⿰', '口': '⿰', '虫': '⿰', 
  '足': '⿰', '⻊': '⿰', '车': '⿰', '舟': '⿰', '方': '⿰', '女': '⿰',
  '米': '⿰', '弓': '⿰', '子': '⿰', '马': '⿰', '身': '⿰', '贝': '⿰'
};

const RIGHT_MARKERS = new Set(['刂', '阝', '卩', 'lz', '欠', '页', '隹', '斤', '见', '鸟']);
const BOTTOM_MARKERS = new Set(['心', '灬', '皿', '儿', '贝']);

// 新增：大头部首集合 (Big Head Radicals)
// 这些部首覆盖面积大，需要内部部件更小更扁以避免重叠
const BIG_HEAD_RADICALS = new Set(['尸', '户', '麻', '辰', '鹿', '虎', '气', '风']);

// --- C. AST 解析与转换逻辑 ---

// 1. 输入字符串 -> 标准 IDS 前缀表达式
const convertSimpleToIDS = (input: string): string => {
  const desc = input.trim();
  if (!desc) return '?';

  // 已是标准 IDS 格式
  if (IDS_CONFIG[desc[0]]) return desc;

  let cleanDesc = desc;
  // 移除辅助词
  if (desc.length > 2 && !desc.match(/[+/(),]/)) {
      cleanDesc = desc.replace(/字(头|框|底|旁|儿)/g, '').trim();
  }

  // 显式函数语法检测
  const funcMatch = cleanDesc.match(/^([^\(（]+)[\(（](.*?)[\,，]?(.*?)[\)）]$/);
  if (funcMatch) {
    const op = funcMatch[1].trim();
    const p1 = funcMatch[2].trim();
    const p2 = funcMatch[3].trim();
    if (/^(左右|lr|leftright)$/i.test(op)) return `⿰${p1}${p2}`;
    if (/^(上下|tb|topbottom)$/i.test(op)) return `⿱${p1}${p2}`;
    if (/^(全包|围|回|full)$/i.test(op) || op.includes('框')) return `⿴${p1}${p2}`;
    if (/^(上三|门|同)$/i.test(op)) return `⿵${p1}${p2}`;
    if (/^(下三|凶)$/i.test(op)) return `⿶${p1}${p2}`;
    if (/^(左三|匚)$/i.test(op)) return `⿷${p1}${p2}`;
    if (/^(左上|广|病)$/i.test(op)) return `⿸${p1}${p2}`;
    if (/^(右上|气)$/i.test(op)) return `⿹${p1}${p2}`;
    if (/^(左下|辶|走)$/i.test(op)) return `⿺${p1}${p2}`;
    if (/^(镶|嵌|overlay)$/i.test(op)) return `⿻${p1}${p2}`;
  }

  // 简单操作符兼容
  if (cleanDesc.includes('+')) return `⿰${cleanDesc.split('+')[0]}${cleanDesc.split('+')[1]}`;
  if (cleanDesc.includes('/')) return `⿱${cleanDesc.split('/')[0]}${cleanDesc.split('/')[1]}`;

  // 智能隐式推断 (Smart Mode)
  if (cleanDesc.length >= 2) {
      // 提取首个字符作为部首判断依据
      const c1 = cleanDesc[0];
      const remaining = cleanDesc.slice(1); // 支持多字作为部件

      // 1. 检查首字是否为已知强部首
      if (SMART_RADICALS[c1]) {
          return `${SMART_RADICALS[c1]}${c1}${remaining}`;
      }

      // 2. 检查尾字是否为强右/下部件
      if (RIGHT_MARKERS.has(remaining)) return `⿰${c1}${remaining}`;
      if (BOTTOM_MARKERS.has(remaining)) return `⿱${c1}${remaining}`;

      // 3. 默认回退：左右结构 (最常见)
      return `⿰${c1}${remaining}`;
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
        else node.children!.push({ type: 'char', val: '?' });
      }
      return node;
    } else {
      return { type: 'char', val: char };
    }
  };
  return parse();
};

// --- D. 核心渲染 (Render AST to HTML) ---
// 使用 CSS Transform Scale 和 Flexbox 实现紧凑布局
const renderIDSNode = (node: IDSNode): string => {
  // Base Case: 字符
  if (node.type === 'char') {
    // 渲染单字，保持原样，不强制缩放，由父级决定缩放
    return `<span class="flex items-center justify-center w-full h-full leading-none select-none font-normal" style="font-family: inherit;">${node.val}</span>`;
  }

  const { val, children } = node;
  const c = children || [];
  // 预渲染子节点
  const p1 = c[0] ? renderIDSNode(c[0]) : '';
  const p2 = c[1] ? renderIDSNode(c[1]) : '';
  const p3 = c[2] ? renderIDSNode(c[2]) : '';

  // 获取子节点原始值，用于智能大头判断
  const n1Val = c[0]?.val || '';

  // --- A. 包围结构系列 (Enclosure Series) ---

  // 1. ⿸ 左上包 (病字标准 - The Gold Standard)
  if (val === '⿸') { 
    // 智能判断：如果是“大头”部首（如尸），内部部件需要更扁更小
    const isBigHead = BIG_HEAD_RADICALS.has(n1Val);
    const innerStyle = isBigHead 
        ? "scale-[0.55] scale-y-[0.4] origin-bottom-right pr-[5%] pb-[8%]" // 大头调整
        : "scale-[0.6] origin-bottom-right pr-[5%] pb-[5%]"; // 小头标准 (病)

    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-start justify-start scale-[0.9] origin-top-left translate-x-[2px] translate-y-[2px]">${p1}</span>
      <span class="absolute right-0 bottom-0 w-full h-full flex items-end justify-end ${innerStyle}">${p2}</span>
    </span>`;
  }
  
  // 2. ⿹ 右上包 (Mirror H)
  if (val === '⿹') { 
    const isBigHead = BIG_HEAD_RADICALS.has(n1Val);
    const innerStyle = isBigHead 
        ? "scale-[0.55] scale-y-[0.4] origin-bottom-left pl-[5%] pb-[8%]" 
        : "scale-[0.6] origin-bottom-left pl-[5%] pb-[5%]";
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-start justify-end scale-[0.9] origin-top-right translate-x-[-2px] translate-y-[2px]">${p1}</span>
      <span class="absolute left-0 bottom-0 w-full h-full flex items-end justify-start ${innerStyle}">${p2}</span>
    </span>`;
  }
  
  // 3. ⿺ 左下包 (Mirror V)
  if (val === '⿺') { 
     // 左下包通常是大长腿（走、辶），这里沿用标准逻辑，若有大头需求可在此添加
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-start scale-[0.9] origin-bottom-left translate-x-[2px] translate-y-[0px]">${p1}</span>
      <span class="absolute right-0 top-0 w-full h-full flex items-end justify-end scale-[0.6] origin-top-right pr-[5%] pt-[5%] translate-y-[2px]">${p2}</span>
    </span>`;
  }

  // --- B. 线性结构系列 (Linear Series) ---

    // 1. ⿰ 左右结构 - 修复：改为底对齐 (items-end)
  if (val === '⿰') {
    return `<span class="relative w-full h-full block">
      <span class="absolute left-0 top-0 w-[50%] h-full flex items-end justify-start scale-x-[0.4] scale-y-[0.8] origin-bottom-left translate-x-[3px] translate-y-[-1px]">${p1}</span>
      <span class="absolute right-0 top-0 w-[50%] h-full flex items-end justify-end scale-x-[0.5] scale-y-[0.9] origin-bottom-right translate-x-[-3px] translate-y-[0px]">${p2}</span>
    </span>`;
  }


  // 2. ⿱ 上下结构 - 优化：增加垂直方向压扁 (scale-y-0.85)，防止过长
  if (val === '⿱') {
    return `<span class="relative w-full h-full block">
      <span class="absolute top-0 left-0 w-full h-[50%] flex items-start justify-center scale-y-[0.3] scale-x-[0.9] origin-top translate-y-[3px]">${p1}</span>
      <span class="absolute bottom-0 left-0 w-full h-[50%] flex items-end justify-end scale-y-[0.55] scale-x-[0.9] origin-bottom translate-y-[-3px]">${p2}</span>
    </span>`;
  }

  // --- C. 其他特殊包围 (Special Enclosures) ---
  
    // ⿴ 全包 (国) - 修复：改为底对齐，确保不跳动
  if (val === '⿴') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-center scale-[0.9] origin-bottom translate-y-[0px]">${p1}</span>
      <span class="absolute inset-0 flex items-center justify-center scale-[0.5] translate-y-[1px]">${p2}</span>
    </span>`;
  }

  
    // ⿵ 上三包 (门, 同) - 修复：完全参考"病"的锚点逻辑，但方向改为向下锚定
  if (val === '⿵') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-center scale-[0.9] origin-bottom translate-y-[0px]">${p1}</span>
      <span class="absolute inset-0 flex items-end justify-center scale-[0.5] origin-bottom pb-[15%] translate-y-[-1px]">${p2}</span>
    </span>`;
  }

  
  // ⿶ 下三包 (凶) - 优化：内部由 0.6 -> 0.5
  if (val === '⿶') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-end scale-[0.9] origin-bottom translate-y-[0px]">${p1}</span>
      <span class="absolute inset-0 flex items-start justify-center scale-[0.5] origin-top pt-[50%] translate-y-[1px]">${p2}</span>
    </span>`;
  }
  
    // ⿷ 左三包 (区) - 修复：改为底对齐
  if (val === '⿷') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-start scale-[0.9] origin-bottom-left translate-x-[2px] translate-y-[0px]">${p1}</span>
      <span class="absolute inset-0 flex items-end justify-center scale-[0.5] translate-x-[15%] translate-y-[1px]">${p2}</span>
    </span>`;
  }

  
  // --- 4. 其他结构 (Remaining) ---

  // ⿻ 镶嵌 (Overlay)
  if (val === '⿻') { 
    return `<span class="relative w-full h-full block">
      <span class="absolute inset-0 flex items-end justify-center opacity-100 scale-[0.9]">${p1}</span>
      <span class="absolute inset-0 flex items-center justify-center scale-[0.6] font-bold">${p2}</span>
    </span>`;
  }

  // ⿲ (森) - 修复：使用 flex 均分 + 统一缩放，不再散开
  if (val === '⿲') {
    return `<span class="absolute inset-0 flex flex-row items-center justify-center w-full h-full">
        <span class="w-1/3 h-full flex items-center justify-center"><span class="scale-[0.6] scale-y-[1.0] scale-x-[0.6]">${p1}</span></span>
        <span class="w-1/3 h-full flex items-center justify-center"><span class="scale-[0.6] scale-y-[0.4] scale-x-[0.6]">${p2}</span></span>
        <span class="w-1/3 h-full flex items-center justify-center"><span class="scale-[0.6] scale-y-[1.0] scale-x-[0.6]">${p3}</span></span>
    </span>`;
  }

  // ⿳ (晶) - 修复：使用 flex 均分 + 统一缩放，不再散开
  if (val === '⿳') {
    return `<span class="absolute inset-0 flex flex-col items-center justify-center w-full h-full">
        <span class="h-1/3 w-full flex items-center justify-center"><span class="scale-[0.6] scale-x-[1.0] scale-y-[0.4]">${p1}</span></span>
        <span class="h-1/3 w-full flex items-center justify-center"><span class="scale-[0.6] scale-x-[0.8] scale-y-[0.2]"> ${p2}</span></span>
        <span class="h-1/3 w-full flex items-center justify-center"><span class="scale-[0.6] scale-x-[1.0] scale-y-[0.4]">${p3}</span></span>
    </span>`;
  }

  return `${p1}${p2}`;
};

// 5. 主入口
const createZaoziHTML = (rawDesc: string) => {
  try {
    const idsString = convertSimpleToIDS(rawDesc);
    const ast = parseIDSString(idsString);
    if (!ast) return rawDesc;
    
    const innerHTML = renderIDSNode(ast);
    return `<span class="zaozi-container inline-block w-[1em] h-[1em] relative mx-0 select-none text-inherit" title="造字：${rawDesc} [${idsString}]" style="vertical-align: text-bottom;">
      <span class="w-full h-full relative block" style="transform: scale(1.15) translateY(-0.15em); transform-origin: center;">
        ${innerHTML}
      </span>
    </span>`;
  } catch (e) {
    return `<span class="text-xs">[Error]</span>`;
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
      // Code spans (allowed color)
      .replace(/`([^`]+)`/g, '<code class="bg-[#2c313a] text-[#98c379] px-1.5 py-0.5 rounded text-sm font-mono border border-[#3e4451] mx-1">$1</code>')
      // Images
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl my-4 w-full shadow-lg border border-[#3e4451]"/>')
      // Strong (No Color, just bold)
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#e6e6e6] font-bold">$1</strong>')
      // Em (No Color, just italic)
      .replace(/\*(.*?)\*/g, '<em class="text-[#c8c8c8] italic font-serif">$1</em>')
      // Del
      .replace(/~~(.*?)~~/g, '<del class="text-[#7f848e] decoration-1">$1</del>')
      // Fonts
      .replace(/%%(.*?)\|(.*?)%%/g, '<span style="font-family: \'$1\', sans-serif;">$2</span>')
      // Remove Zaozi definitions
      .replace(/\[(?:造字|zaozi)\s*[:：]\s*([a-zA-Z0-9_\u4e00-\u9fa5]+)\s*[|｜]\s*(.*?)\]/gi, '') 
      // Replace Zaozi placeholders
      .replace(/:([a-zA-Z0-9_\u4e00-\u9fa5]+):/g, (match, key) => zaoziRegistry[key] || match)
      // Links
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
    // Headers: Neutral Colors
    if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold text-[#e6e6e6] mt-8 mb-4 pb-2 border-b border-[#3e4451]" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} />;
    if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-2xl font-semibold text-[#dadada] mt-6 mb-3" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(3))}} />;
    if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-xl font-medium text-[#cecece] mt-4 mb-2" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(4))}} />;
    if (trimmed.startsWith('> ')) return <blockquote key={idx} className="border-l-4 border-[#5c6370] bg-[#2c313a]/50 pl-4 py-2 my-2 rounded-r italic text-[#9ca3af]"><span dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></blockquote>;
    // List Bullets: Structural Blue allowed, Text is neutral
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <div key={idx} className="flex gap-2 ml-2 my-1"><span className="text-[#abb2bf] font-bold">•</span><span className="flex-1 break-words leading-7 text-[#abb2bf]" dangerouslySetInnerHTML={{__html: inlineParser(trimmed.slice(2))}} /></div>;
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) return <div key={idx} className="flex gap-2 ml-2 my-1"><span className="text-[#abb2bf] font-mono font-bold">{orderedMatch[1]}.</span><span className="flex-1 break-words leading-7 text-[#abb2bf]" dangerouslySetInnerHTML={{__html: inlineParser(orderedMatch[2])}} /></div>;
    return <p key={idx} className="leading-7 mb-2 break-words text-justify text-[#abb2bf]" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{__html: inlineParser(trimmed)}} />;
  });
};
