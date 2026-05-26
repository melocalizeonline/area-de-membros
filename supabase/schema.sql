create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  is_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  external_product_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_products (
  member_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'kiwify', 'eduzz')),
  external_order_id text,
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (member_id, product_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  cover_url text,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  description text,
  video_provider text not null default 'youtube' check (video_provider in ('youtube', 'vimeo', 'panda', 'embed', 'self_hosted')),
  video_url text,
  embed_code text,
  thumbnail_url text,
  duration_seconds int,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  cover_url text,
  icon text,
  tool_type text not null default 'internal' check (tool_type in ('internal', 'external')),
  external_url text,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_mappings (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('kiwify', 'eduzz')),
  external_product_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider, external_product_id)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('kiwify', 'eduzz')),
  event_id text,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  member_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  progress_seconds int not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (member_id, lesson_id)
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.member_products enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.tools enable row level security;
alter table public.integration_mappings enable row level security;
alter table public.webhook_events enable row level security;
alter table public.lesson_progress enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true and active = true
  );
$$;

create policy "profiles_self_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products_member_or_admin" on public.products
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.member_products mp
      where mp.product_id = products.id and mp.member_id = auth.uid() and mp.active = true
    )
  );

create policy "products_admin_all" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "member_products_self_or_admin" on public.member_products
  for select to authenticated using (member_id = auth.uid() or public.is_admin());

create policy "member_products_admin_all" on public.member_products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "courses_member_or_admin" on public.courses
  for select to authenticated using (
    public.is_admin() or (
      published = true and exists (
        select 1 from public.member_products mp
        where mp.product_id = courses.product_id and mp.member_id = auth.uid() and mp.active = true
      )
    )
  );

create policy "courses_admin_all" on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "modules_course_access" on public.course_modules
  for select to authenticated using (
    public.is_admin() or exists (
      select 1
      from public.courses c
      join public.member_products mp on mp.product_id = c.product_id
      where c.id = course_modules.course_id and mp.member_id = auth.uid() and mp.active = true
    )
  );

create policy "modules_admin_all" on public.course_modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lessons_course_access" on public.lessons
  for select to authenticated using (
    public.is_admin() or (
      published = true and exists (
        select 1
        from public.course_modules cm
        join public.courses c on c.id = cm.course_id
        join public.member_products mp on mp.product_id = c.product_id
        where cm.id = lessons.module_id and mp.member_id = auth.uid() and mp.active = true
      )
    )
  );

create policy "lessons_admin_all" on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "tools_member_or_admin" on public.tools
  for select to authenticated using (
    public.is_admin() or (
      published = true and exists (
        select 1 from public.member_products mp
        where mp.product_id = tools.product_id and mp.member_id = auth.uid() and mp.active = true
      )
    )
  );

create policy "tools_admin_all" on public.tools
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "integration_mappings_admin_all" on public.integration_mappings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "webhook_events_admin_select" on public.webhook_events
  for select to authenticated using (public.is_admin());

create policy "lesson_progress_self_or_admin" on public.lesson_progress
  for select to authenticated using (member_id = auth.uid() or public.is_admin());

create policy "lesson_progress_self_mutation" on public.lesson_progress
  for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
