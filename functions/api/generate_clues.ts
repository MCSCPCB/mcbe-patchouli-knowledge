interface Env {
  VOLCENGINE_API_KEY: string;
  VOLCENGINE_ENDPOINT_ID: string;
  SILICONFLOW_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. 检查环境变量
  if (!env.VOLCENGINE_API_KEY || !env.VOLCENGINE_ENDPOINT_ID || !env.SILICONFLOW_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI Service Configuration Missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const VOLC_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const SILICON_URL = 'https://api.siliconflow.cn/v1/embeddings';

  try {
    const body = await request.json() as { content: string, title?: string }; // 增加 title 读取
    const { content, title } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // === 第一步：调用火山引擎 (生成增强线索) ===
    // 使用 V4.0 提示词工程：去幻觉、技术口语化、逻辑注入
    
    const volcResponse = await fetch(VOLC_URL, {
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
            content: `你是一名经验丰富的 Minecraft 基岩版 (Bedrock Edition) 技术开发者。
你的任务是阅读用户上传的技术文档，并生成一段**专门用于增强搜索匹配**的线索摘要。

请使用以下【开发者思维逻辑】分析文档，不要瞎编乱造，只基于文档内容进行合理发散：

**一、 分析逻辑（请在内心执行，不要输出）：**
1.  **如果文档讲的是“美工/客户端” (Client/Resource)**：
    *   看到 *Geometry/Model* -> 联想：自定义模型、多方块结构伪装。
    *   看到 *Texture/Material* -> 联想：动态贴图、序列帧动画、生物变种、发光/透明材质。
    *   看到 *Animation Controller* -> 联想：状态机切换、技能前摇/后摇、动作融合。

2.  **如果文档讲的是“数驱/服务端/SAPI” (Server/Behavior)**：
    *   看到 *Entity Components* -> 联想：行为树、属性定义、交互事件。
    *   看到 *Script API (SAPI)* -> 联想：复杂逻辑处理、跨维度通讯、动态生成、自定义指令。
    *   看到 *Vector/Math* -> 联想：击退计算、视线追踪、弹道修正、相对坐标控制。
    *   看到 *NBT/Dynamic Properties* -> 联想：数据保存、跨实体通讯、状态记忆。

**二、 输出要求：**
*   **语气风格**：使用开发社区通用的技术口语（如：搓json、写脚本、挂载、回调、同步、数驱），简单直白。
*   **格式**：严格使用 "1. 2. 3." 序号分点，**不要**使用中括号 [] 或 Markdown 标题。

**三、 最终输出模板（严格遵守）：**

1. 技术本质总结
<一句话大白话概括：这篇东西到底是教人改贴图的，还是写代码逻辑的，还是改生物行为的？>

2. 能拿来做什么 (实际应用)
<基于文档内容，列出 3-5 个具体的游戏内效果。例如：如果讲实体位移，就列出“做载具、做电梯、把实体吸过来”；如果讲Molang，就列出“血量低变色、根据时间变换外观”。>

3. 检索关键词补充
<列出相关的 API 名称、文件名后缀（如 .json, .lang）、关键函数名、常见报错信息。如果是跨端技术，请注明“客户端同步”或“服务端逻辑”。>`
          },
          { 
            role: 'user', 
            content: `【标题】：${title || '无标题'}\n【正文】：${content}` 
          }
        ]
      })
    });

    if (!volcResponse.ok) throw new Error(`Volcengine Error: ${await volcResponse.text()}`);
    const volcData: any = await volcResponse.json();
    const clues = volcData.choices?.[0]?.message?.content || '';


    // === 第二步：调用硅基流动 (生成向量) ===
    // 关键优化：我们将 "标题" + "原始内容" + "AI生成的分析(clues)" 拼接在一起生成向量。
    // 这样，向量里就包含了 "隐藏的玩法关联"，实现“搜火车出实体”的效果。

    const textToEmbed = `Title: ${title || ''}\n\nContent Context:\n${content.substring(0, 6000)}\n\nAI Analysis & Use Cases:\n${clues}`;

    const siliconResponse = await fetch(SILICON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SILICONFLOW_API_KEY}`
      },
      body: JSON.stringify({
        model: 'BAAI/bge-m3',
        input: textToEmbed, // 这里的 input 现在非常“丰满”
        encoding_format: 'float'
      })
    });

    if (!siliconResponse.ok) throw new Error(`SiliconFlow Error: ${await siliconResponse.text()}`);
    const siliconData: any = await siliconResponse.json();
    const embedding = siliconData.data?.[0]?.embedding;


    // === 返回结果 ===
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
