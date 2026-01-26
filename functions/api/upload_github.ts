interface Env {
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  GITHUB_REPO: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. 检查环境变量
  if (!env.GITHUB_TOKEN || !env.GITHUB_USERNAME || !env.GITHUB_REPO) {
    return new Response(JSON.stringify({ error: 'Config Error', details: 'Missing Env Vars' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { content, fileName, folder } = await request.json() as { content: string; fileName: string; folder?: string };

    if (!content || !fileName) {
      return new Response(JSON.stringify({ error: 'Missing content or fileName' }), { status: 400 });
    }

    // 2. 处理文件夹名称 (新增逻辑)
    // 如果没有 folder，使用 'others'；去除路径分隔符 '/' 防止被当成子目录；去除首尾空格
    let safeFolder = 'others';
    if (folder && folder.trim()) {
        // 将不安全的字符替换为下划线，例如 / 或 \
        safeFolder = folder.trim().replace(/[\\/]/g, '_');
    }

    // 3. 拼接路径
    // 最终路径类似: images/My_Title/uuid.jpg
    const path = `images/${safeFolder}/${fileName}`;
    
    // 注意：URL 包含中文或空格时需要 encodeURI，否则 GitHub API 可能会报错
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const githubUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${encodedPath}`;

    const githubRes = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'KB-App'
      },
      body: JSON.stringify({
        message: `Upload ${fileName} to ${safeFolder}`, // Commit message 也可以带上目录名
        content: content
      })
    });

    if (!githubRes.ok) {
      const err = await githubRes.text();
      return new Response(JSON.stringify({ error: 'GitHub Refused', details: err }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 3. 返回 CDN 链接
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}@main/${encodeURI(path)}`;
    
    return new Response(JSON.stringify({ url: cdnUrl }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
