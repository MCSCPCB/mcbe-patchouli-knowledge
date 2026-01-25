interface Env {
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  GITHUB_REPO: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. 检查环境变量
  if (!env.GITHUB_TOKEN || !env.GITHUB_USERNAME || !env.GITHUB_REPO) {
    return new Response(JSON.stringify({ error: 'Server GitHub configuration missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { content, fileName } = await request.json() as { content: string, fileName: string };

    if (!content || !fileName) {
      return new Response('Missing content or fileName', { status: 400 });
    }

    const path = `images/${fileName}`;
    const message = `Upload ${fileName}`;
    const url = `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${path}`;

    // 2. 上传到 GitHub
    const githubRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'KB-App'
      },
      body: JSON.stringify({
        message: message,
        content: content, // Base64 content
      })
    });

    if (!githubRes.ok) {
      const errorText = await githubRes.text();
      return new Response(JSON.stringify({ error: 'GitHub API Error', details: errorText }), { status: 500 });
    }

    // 3. 返回 jsDelivr CDN 链接
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}@main/${path}`;

    return new Response(JSON.stringify({ url: cdnUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
