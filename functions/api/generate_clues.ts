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
    const body = await request.json() as { content: string };
    const { content } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), { 
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
            content: '你是一个知识库助手。请根据用户提供的知识内容，提取并生成一段“检索线索”。这段线索应包含：核心功能关键词、适用场景、解决的问题、同义词。输出要求：纯文本，不要Markdown格式，不要换行，控制在100字以内，便于搜索引擎匹配。'
          },
          { role: 'user', content: content }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Volcengine API Error:', errorText);
      return new Response(JSON.stringify({ error: 'AI Provider Error', details: errorText }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const aiData: any = await aiResponse.json();
    const clues = aiData.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ clues }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('AI Service Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate clues', message: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

