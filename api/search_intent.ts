import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const API_KEY = process.env.VOLCENGINE_API_KEY;
const ENDPOINT_ID = process.env.VOLCENGINE_ENDPOINT_ID;
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { query } = req.body;

  try {
    const response = await axios.post(
      API_URL,
      {
        model: ENDPOINT_ID,
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
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    const searchStr = response.data.choices[0].message.content;
    return res.status(200).json({ searchStr });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to analyze intent' });
  }
}

