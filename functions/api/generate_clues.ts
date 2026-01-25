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
    const body = await request.json() as { content: string };
    const { content } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // === 并行任务 ===
    
    // 1. 火山引擎：生成文本线索
    const taskClues = fetch(VOLC_URL, {
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
    }).then(async res => {
      if (!res.ok) throw new Error(`Volcengine Error: ${await res.text()}`);
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || '';
    });

    // 2. 硅基流动：生成向量
    const taskEmbedding = fetch(SILICON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SILICONFLOW_API_KEY}`
      },
      body: JSON.stringify({
        model: 'BAAI/bge-m3',
        input: content.substring(0, 8000), 
        encoding_format: 'float'
      })
    }).then(async res => {
      if (!res.ok) throw new Error(`SiliconFlow Error: ${await res.text()}`);
      const data: any = await res.json();
      return data.data?.[0]?.embedding;
    });

    const [clues, embedding] = await Promise.all([taskClues, taskEmbedding]);

    // 返回对象结构
    return new Response(JSON.stringify({ clues, embedding }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('AI Service Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process content', message: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
