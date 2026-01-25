interface Env {
  VOLCENGINE_API_KEY: string;
  VOLCENGINE_ENDPOINT_ID: string;
  SILICONFLOW_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.VOLCENGINE_API_KEY || !env.VOLCENGINE_ENDPOINT_ID || !env.SILICONFLOW_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI Service Configuration Missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const VOLC_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const SILICON_URL = 'https://api.siliconflow.cn/v1/embeddings';

  try {
    const body = await request.json() as { query: string };
    const { query } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // === 第一步：火山引擎 (意图翻译 + 关键词提取) ===
    // 我们要求 AI 返回 JSON，同时搞定 "向量描述" 和 "SQL关键词"
    
    const intentResponse = await fetch(VOLC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.VOLCENGINE_API_KEY}`
      },
      body: JSON.stringify({
        model: env.VOLCENGINE_ENDPOINT_ID,
        messages: [
          {
            role: 'system',
            content: `你是一个 Minecraft 基岩版 (Bedrock Edition) 开发领域的**搜索意图翻译官**。
你的目标是将用户的搜索词转换为两部分数据，分别用于向量检索和数据库关键词匹配。

请根据用户输入执行以下【意图转译策略】：

**策略 A：用户问“玩法功能” (如：做火车、做枪、技能)**
*   **翻译逻辑**：将玩法拆解为底层的**组件组合**。
*   *知识注入*：移动 -> Entity Positioning/Velocity; 显示 -> Render Controller/Geometry; 交互 -> Script API Events.

**策略 B：用户问“底层技术” (如：向量点积、NBT、同步)**
*   **翻译逻辑**：将口语转为精准的**API定义**。
*   *知识注入*：传递 -> Data Sync/Dynamic Properties; 向量 -> Vector3/Math Library; 生成 -> spawnEntity.

**输出格式要求 (JSON)**：
必须只返回一个标准 JSON 对象（不要 Markdown 代码块），包含两个字段：
1. "vector_context": (String) 一段以英文为主的技术描述，**必须**包含 "Minecraft Bedrock Development context" 前缀。这是给向量模型看的。
2. "sql_keywords": (String) 提取的核心技术词，如果有多个用 " OR " 连接。这是给数据库模糊搜索用的。

**Example JSON:**
{
  "vector_context": "Minecraft Bedrock Development context: Real-time entity positioning mechanics. Tech path: Script API, Vector3 calculations, applyImpulse, Rideable component.",
  "sql_keywords": "Script_API OR Vector3 OR applyImpulse"
}`
          },
          { role: 'user', content: query }
        ]
      })
    });

    if (!intentResponse.ok) throw new Error(`Volcengine Error: ${await intentResponse.text()}`);
    
    const intentData: any = await intentResponse.json();
    const rawContent = intentData.choices?.[0]?.message?.content || '{}';
    
    // 安全解析 JSON (防止 AI 偶尔返回非 JSON 格式)
    let parsedIntent = { vector_context: '', sql_keywords: '' };
    try {
        // 尝试移除可能存在的 Markdown 代码块标记 ```json ... ```
        const cleanJson = rawContent.replace(/```json|```/g, '').trim();
        parsedIntent = JSON.parse(cleanJson);
    } catch (e) {
        console.warn('AI returned invalid JSON, falling back to raw query', e);
        // 降级策略：如果是乱码，直接用原词
        parsedIntent = { 
            vector_context: `Minecraft Bedrock Development context: ${query}`, 
            sql_keywords: query 
        };
    }

    // === 第二步：硅基流动 (生成向量) ===
    // 这里的输入是 AI 翻译过的 "vector_context"，而不是用户原本的 "怎么做火车"
    // 这实现了 "搜玩法 -> 匹配技术" 的核心逻辑

    const embeddingResponse = await fetch(SILICON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SILICONFLOW_API_KEY}`
      },
      body: JSON.stringify({
        model: 'BAAI/bge-m3',
        input: parsedIntent.vector_context || query, // 优先用翻译后的，否则用原词
        encoding_format: 'float'
      })
    });

    if (!embeddingResponse.ok) throw new Error(`SiliconFlow Error: ${await embeddingResponse.text()}`);
    const embeddingData: any = await embeddingResponse.json();
    const embedding = embeddingData.data?.[0]?.embedding;

    // === 返回结果 ===
    return new Response(JSON.stringify({ 
        searchStr: parsedIntent.sql_keywords, // 用于前端降级搜索
        embedding: embedding                  // 用于前端向量搜索
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Intent Analysis Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to analyze intent' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
