interface Env {
  VOLCENGINE_API_KEY: string;
  VOLCENGINE_ENDPOINT_ID: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. 检查环境变量
  if (!env.VOLCENGINE_API_KEY || !env.VOLCENGINE_ENDPOINT_ID) {
    return new Response(JSON.stringify({ error: 'AI Service Configuration Missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

  try {
    // 2. 解析请求体
    const body = await request.json() as { query: string };
    const { query } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 调用火山引擎 API (使用原生 fetch)
    const aiResponse = await fetch(API_URL, {
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
5. 不要包含任何解释，只返回转换后的字符串。
例如：用户输入“我想找个自动备份脚本”，输出："自动备份 OR 数据库备份 OR backup script"`
          },
          { role: 'user', content: query }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Volcengine API Error:', errorText);
      return new Response(JSON.stringify({ error: 'AI Provider Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const aiData: any = await aiResponse.json();
    const searchStr = aiData.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ searchStr }), {
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
