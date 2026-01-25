interface Env {
  VOLCENGINE_API_KEY: string;
  VOLCENGINE_ENDPOINT_ID: string;
  SILICONFLOW_API_KEY: string; // 新增
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

    // === 并行调用 ===

    // 任务 A: 火山引擎 - 搜索意图分析 (原有功能)
    const taskIntent = fetch(VOLC_URL, {
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
            content: `你是一个搜索意图分析专家。用户会输入一句自然语言查询，你需要将其转换为 PostgreSQL 的 websearch_to_tsquery 可识别的查询字符串。
规则：
1. 提取核心关键词。
2. 如果有多个可能的同义词，用 " OR " 连接。
3. 如果有多个必须满足的条件，用 " " (空格) 或 " AND " 连接。
4. 所有的关键词和逻辑符号组成一个单行字符串返回。
5. 不要包含任何解释，只返回转换后的字符串。`
          },
          { role: 'user', content: query }
        ]
      })
    }).then(async res => {
      if (!res.ok) throw new Error(`Volcengine Error: ${await res.text()}`);
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || '';
    });

    // 任务 B: 硅基流动 - 生成查询向量 (新增功能)
    const taskEmbedding = fetch(SILICON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SILICONFLOW_API_KEY}`
      },
      body: JSON.stringify({
        model: 'BAAI/bge-m3',
        input: query,
        encoding_format: 'float'
      })
    }).then(async res => {
      if (!res.ok) throw new Error(`SiliconFlow Error: ${await res.text()}`);
      const data: any = await res.json();
      return data.data?.[0]?.embedding;
    });

    const [searchStr, embedding] = await Promise.all([taskIntent, taskEmbedding]);

    return new Response(JSON.stringify({ searchStr, embedding }), {
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
