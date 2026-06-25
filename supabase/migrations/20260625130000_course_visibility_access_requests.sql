-- Visibilidade do curso no portal para quem NÃO tem acesso:
--   'hidden' (padrão) → não aparece para quem não tem acesso
--   'locked'          → aparece bloqueado, com botão "Solicitar acesso"
alter table public.courses
  add column if not exists portal_visibility text not null default 'hidden';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_portal_visibility_check'
  ) then
    alter table public.courses
      add constraint courses_portal_visibility_check
      check (portal_visibility in ('hidden','locked'));
  end if;
end $$;

-- Solicitações de acesso a cursos
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create index if not exists idx_access_requests_tenant on public.access_requests(tenant_id, status);

alter table public.access_requests enable row level security;

drop policy if exists "access_requests own select" on public.access_requests;
create policy "access_requests own select" on public.access_requests
  for select using (user_id = auth.uid());

drop policy if exists "access_requests own insert" on public.access_requests;
create policy "access_requests own insert" on public.access_requests
  for insert with check (user_id = auth.uid());

drop policy if exists "access_requests tenant select" on public.access_requests;
create policy "access_requests tenant select" on public.access_requests
  for select using (is_tenant_editor(tenant_id) or is_admin());

drop policy if exists "access_requests tenant update" on public.access_requests;
create policy "access_requests tenant update" on public.access_requests
  for update using (is_tenant_editor(tenant_id) or is_admin());
