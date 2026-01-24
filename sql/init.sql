-- 1. 创建枚举类型 (已对齐 Frontend types.ts)
-- 注意：前端 User role 是 'admin' | 'user'
create type user_role as enum ('user', 'admin');
-- 注意：前端 Status 是 'published' | 'pending' | 'rejected'
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

-- 3. 创建知识库表 (已修正)
create table public.knowledge_posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) not null,
  title text not null,
  content text not null,
  -- 移除旧的 type 枚举，改为 tags 数组以支持前端的多标签系统
  tags text[] default '{}'::text[], 
  attachments jsonb default '[]'::jsonb,
  search_clues text, -- 对应前端 aiClues
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

-- 允许作者删除自己的 pending 贴，管理员删除任意贴
create policy "Delete policy"
  on public.knowledge_posts for delete using (
    (auth.uid() = author_id and status = 'pending') or
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- 更新策略：作者改 pending，管理员改所有
create policy "Update policy"
  on public.knowledge_posts for update using (
    (auth.uid() = author_id and status = 'pending') or
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- 5. 自动触发器 (保持不变)
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
create index idx_search_clues on public.knowledge_posts using GIN (to_tsvector('english', search_clues));
create index idx_tags on public.knowledge_posts using GIN (tags);

-- 7. 存储桶策略 (Storage Policies) - 针对 'kb-assets'
-- 注意：你需要先在 Supabase 控制台创建一个名为 'kb-assets' 的 Public Bucket

-- 允许任何登录用户上传文件
create policy "Authenticated users can upload assets"
  on storage.objects for insert
  with check (
    bucket_id = 'kb-assets' and
    auth.role() = 'authenticated'
  );

-- 允许所有人查看文件 (配合 Public Bucket 设置)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'kb-assets' );

-- 允许用户删除自己上传的文件 (可选)
create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'kb-assets' and
    auth.uid() = owner
  );
