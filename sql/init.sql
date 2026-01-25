-- ==========================================
-- MCBE Knowledge Base - Full Init Schema
-- Updated for Vector Search & Chinese Support
-- ==========================================

-- 0. [新增] 启用必要的扩展 (必须最先执行)
create extension if not exists vector;

-- 1. 创建枚举类型
create type user_role as enum ('user', 'admin');
create type knowledge_status as enum ('pending', 'published', 'rejected');

-- 2. 创建用户资料表
create table public.profiles (
  id uuid references auth.users not null primary key,
  github_id text,
  avatar_url text,
  role user_role default 'user'::user_role,
  is_banned boolean default false,
  created_at timestamptz default now()
);

-- 3. 创建知识库表
create table public.knowledge_posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) not null,
  title text not null,
  content text not null,
  tags text[] default '{}'::text[], 
  attachments jsonb default '[]'::jsonb,
  search_clues text,
  -- [新增] 向量存储列 (维度 1024 对应 BAAI/bge-m3)
  embedding vector(1024),
  status knowledge_status default 'pending'::knowledge_status,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. RLS 策略 (安全设置)
alter table public.profiles enable row level security;
alter table public.knowledge_posts enable row level security;

-- Profiles 策略
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using ( true );

create policy "Only admins can update profiles"
  on public.profiles for update using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- Knowledge Posts 策略
create policy "Anyone can read posts"
  on public.knowledge_posts for select using ( true );

create policy "Authenticated non-banned users can insert"
  on public.knowledge_posts for insert with check (
    auth.role() = 'authenticated' and
    exists ( select 1 from public.profiles where id = auth.uid() and is_banned = false )
  );

-- 删除策略：作者删 Pending，管理员删所有
create policy "Delete policy"
  on public.knowledge_posts for delete using (
    (auth.uid() = author_id and status = 'pending') or
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- 更新策略：作者改 Pending，管理员改所有
create policy "Update policy"
  on public.knowledge_posts for update using (
    (auth.uid() = author_id and status = 'pending') or
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- 5. 自动触发器：处理新用户
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'user_name' = 'MCSCPCB' then
    insert into public.profiles (id, github_id, avatar_url, role)
    values (new.id, new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'avatar_url', 'admin');
  else
    insert into public.profiles (id, github_id, avatar_url, role)
    values (new.id, new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'avatar_url', 'user');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. 索引优化

-- [修正] 关键词索引: 改为 'simple' 以支持中文分词
create index idx_search_clues on public.knowledge_posts using GIN (to_tsvector('simple', search_clues));

create index idx_tags on public.knowledge_posts using GIN (tags);

-- [新增] 向量索引: 使用 HNSW 算法加速相似度查询
create index idx_embedding on public.knowledge_posts using hnsw (embedding vector_l2_ops);


-- 7. [新增] 向量匹配函数 (核心检索逻辑)
create or replace function match_knowledge (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns setof knowledge_posts
language plpgsql
as $$
begin
  return query
  select *
  from knowledge_posts
  where 1 - (knowledge_posts.embedding <=> query_embedding) > match_threshold
  order by knowledge_posts.embedding <=> query_embedding
  limit match_count;
end;
$$;


-- 8. 存储系统配置 (自动创建 Bucket + 策略)
insert into storage.buckets (id, name, public)
values ('kb-assets', 'kb-assets', true)
on conflict (id) do nothing;

-- 上传策略
create policy "Authenticated users can upload assets"
  on storage.objects for insert
  with check (
    bucket_id = 'kb-assets' and
    auth.role() = 'authenticated'
  );

-- 查看策略
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'kb-assets' );

-- 删除策略 (仅限自己)
create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'kb-assets' and
    auth.uid() = owner
  );
