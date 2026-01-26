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
    const { content, fileName } = await request.json() as { content: string; fileName: string };

    if (!content || !fileName) {
      return new Response(JSON.stringify({ error: 'Missing content or fileName' }), { status: 400 });
    }

    // 2. 上传到 GitHub
    const path = `images/${fileName}`;
    const githubUrl = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${path}`;

    const githubRes = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'KB-App'
      },
      body: JSON.stringify({
        message: `Upload ${fileName}`,
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
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}@main/${path}`;
    
    return new Response(JSON.stringify({ url: cdnUrl }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
