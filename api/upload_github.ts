import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// 环境变量
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { content, fileName } = req.body;

  if (!content || !fileName) {
    return res.status(400).send('Missing content or fileName');
  }

  if (!GITHUB_TOKEN || !GITHUB_USERNAME || !GITHUB_REPO) {
    return res.status(500).send('Server GitHub configuration missing');
  }

  try {
    const path = `images/${fileName}`;
    const message = `Upload ${fileName}`;
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`;

    // 上传到 GitHub
    await axios.put(
      url,
      {
        message: message,
        content: content, // Base64 content
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'KB-App'
        }
      }
    );

    // 构建 jsDelivr CDN 链接 (注意：仓库必须是 Public)
    // 格式: https://cdn.jsdelivr.net/gh/user/repo@main/path
    // 这里假设分支名为 main，如果是 master 请自行调整
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_USERNAME}/${GITHUB_REPO}@main/${path}`;

    return res.status(200).json({ url: cdnUrl });
  } catch (error: any) {
    console.error('GitHub Upload Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to upload image to storage' });
  }
}
