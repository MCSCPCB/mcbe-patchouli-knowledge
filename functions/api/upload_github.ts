interface Env {
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  GITHUB_REPO: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  [span_3](start_span)// 1. 检查环境变量[span_3](end_span)
  if (!env.GITHUB_TOKEN || !env.GITHUB_USERNAME || !env.GITHUB_REPO) {
    return new Response(JSON.stringify({ error: 'Config Error', details: 'Missing Env Vars' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    [span_4](start_span)// 修改点：从请求中额外获取 folderName[span_4](end_span)
    const { content, fileName, folderName } = await request.json() as { 
      content: string; 
      fileName: string; 
      folderName: string; 
    };

    [span_5](start_span)// 修改点：验证 folderName 必须存在[span_5](end_span)
    if (!content || !fileName || !folderName) {
      return new Response(JSON.stringify({ error: 'Missing content, fileName or folderName' }), { status: 400 });
    }

    // 2. 上传到 GitHub
    [span_6](start_span)// 修改点：路径修改为 images/文件夹名/文件名[span_6](end_span)
    const path = `images/${folderName}/${fileName}`;
    const githubUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${path}`;
    
    const githubRes = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'KB-App'
      },
      body: JSON.stringify({
        message: `Upload ${fileName} to ${folderName}`,
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

    [span_7](start_span)// 3. 返回 CDN 链接[span_7](end_span)
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}@main/${path}`;
    return new Response(JSON.stringify({ url: cdnUrl }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
