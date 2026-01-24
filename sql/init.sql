-- 1. 创建枚举类型 (对应 types.ts)
create type user_role as enum ('user', 'admin');
create type knowledge_status as enum ('pending', 'reviewed');
create type knowledge_type as enum ('script', 'block', 'entity');

-- 2. 创建用户资料表 (扩展 auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  github_id text, -- 对应 githubId
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
  type knowledge_type not null,
  attachments jsonb default '[]'::jsonb, -- 存储 Attachment[] 数组
  search_clues text, -- AI 生成的检索线索
  status knowledge_status default 'pending'::knowledge_status,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. 开启行级安全策略 (RLS) - 这是安全的基石
alter table public.profiles enable row level security;
alter table public.knowledge_posts enable row level security;

-- 4.1 Profiles 策略
-- 所有人都可以看别人的基本资料
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

-- 只有管理员可以修改用户状态 (如封禁)
create policy "Only admins can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4.2 Knowledge Posts 策略
-- 所有人都能看 (包括未审核的，需求如此)
create policy "Anyone can read posts"
  on public.knowledge_posts for select
  using ( true );

-- 登录且未被封禁的用户可以投稿
create policy "Authenticated non-banned users can insert"
  on public.knowledge_posts for insert
  with check (
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_banned = false
    )
  );

-- 修改/删除策略 (核心逻辑)
create policy "Users can delete their own pending posts, Admins can delete all"
  on public.knowledge_posts for delete
  using (
    ( -- 作者本人且状态为 pending
      auth.uid() = author_id and status = 'pending'
    )
    or
    ( -- 或者是管理员
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- 仅管理员可以修改审核状态 (status)
-- 这里简化处理：允许管理员 Update 任意字段；允许作者 Update 自己的 pending 内容
create policy "Edit policy"
  on public.knowledge_posts for update
  using (
    (auth.uid() = author_id and status = 'pending')
    or
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- 5. 自动化 Trigger: 处理新用户注册
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
begin
  -- 如果是 MCSCPCB，自动设为管理员
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

-- 6. 性能优化：全文检索索引
-- 这将加速基于线索的匹配
create index idx_search_clues on public.knowledge_posts using GIN (to_tsvector('english', search_clues));
-- 注意：如果主要是中文，Supabase 默认 parser 可能不够完美，但在关键词匹配场景下英文 parser 兼容性尚可
-- 如果需要更强中文支持，可以使用 simple 配置或 pg_jieba (supabase 需特定配置)
-- 这里暂时使用 english 配置
