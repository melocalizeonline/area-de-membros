-- ── Módulo "Apps e Integrações" → Hospedagem (Hostinger) ──

-- Config de plataforma (superadmin): credenciais globais (ex.: Hostinger API key).
-- Sem políticas RLS = acesso apenas via service_role (edge functions). Nunca exposto ao client.
create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  credentials jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  updated_at timestamptz not null default now()
);
alter table public.platform_integrations enable row level security;

-- Vínculo de domínio/hospedagem a um tenant (superadmin gerencia).
create table if not exists public.hosting_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null,
  provider text not null default 'hostinger',
  external_id text,
  meta jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain)
);
create index if not exists idx_hosting_assignments_tenant on public.hosting_assignments(tenant_id);
alter table public.hosting_assignments enable row level security;

drop policy if exists "hosting_assignments tenant read" on public.hosting_assignments;
create policy "hosting_assignments tenant read" on public.hosting_assignments
  for select using (is_tenant_editor(tenant_id) or is_admin());

drop policy if exists "hosting_assignments admin all" on public.hosting_assignments;
create policy "hosting_assignments admin all" on public.hosting_assignments
  for all using (is_admin()) with check (is_admin());

-- Solicitações de hospedagem (tenant pede → cai no superadmin).
create table if not exists public.hosting_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_hosting_requests_status on public.hosting_requests(status);
alter table public.hosting_requests enable row level security;

drop policy if exists "hosting_requests insert" on public.hosting_requests;
create policy "hosting_requests insert" on public.hosting_requests
  for insert with check (is_tenant_editor(tenant_id) and user_id = auth.uid());

drop policy if exists "hosting_requests read" on public.hosting_requests;
create policy "hosting_requests read" on public.hosting_requests
  for select using (is_tenant_editor(tenant_id) or is_admin());

drop policy if exists "hosting_requests admin update" on public.hosting_requests;
create policy "hosting_requests admin update" on public.hosting_requests
  for update using (is_admin());
