import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// 火山引擎配置 (环境变量将在 Vercel 后台设置)
const API_KEY = process.env.VOLCENGINE_API_KEY;
const ENDPOINT_ID = process.env.VOLCENGINE_ENDPOINT_ID; // 你的推理接入点 ID
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { content } = req.body;

  if (!content) return res.status(400).send('Missing content');

  try {
    const response = await axios.post(
      API_URL,
      {
        model: ENDPOINT_ID, // 类似于 ep-20250124...
        messages: [
          {
            role: 'system',
            content: '你是一个知识库助手。请根据用户提供的知识内容，提取并生成一段“检索线索”。这段线索应包含：核心功能关键词、适用场景、解决的问题、同义词。输出要求：纯文本，不要Markdown格式，不要换行，控制在100字以内，便于搜索引擎匹配。'
          },
          { role: 'user', content: content }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    const clues = response.data.choices[0].message.content;
    return res.status(200).json({ clues });
  } catch (error) {
    console.error('AI Error:', error);
    return res.status(500).json({ error: 'Failed to generate clues' });
  }
}
