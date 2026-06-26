-- ── WordPress: conexão por site via Application Password (fluxo authorize-application) ──
-- Permite gerenciar plugins do WP do tenant pela API REST do próprio site.
-- Segurança: ambas as tabelas têm RLS habilitado SEM policies = acesso só por service_role
-- (edge functions). A senha de aplicação nunca é exposta ao client.

-- Credencial efetiva por instalação WordPress.
create table if not exists public.wp_connections (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.hosting_assignments(id) on delete cascade,
  domain text not null,
  wp_url text not null,
  wp_user text not null,
  app_password text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, wp_url)
);
create index if not exists idx_wp_connections_assignment on public.wp_connections(assignment_id);
alter table public.wp_connections enable row level security;

-- Token de uso único do fluxo authorize-application (1 clique no wp-admin).
-- O tenant inicia (autenticado) → recebe um token → o WordPress devolve a senha no callback
-- público portando esse token. Sem token válido, o callback não grava nada.
create table if not exists public.wp_connect_tokens (
  token text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  assignment_id uuid not null references public.hosting_assignments(id) on delete cascade,
  domain text not null,
  wp_url text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  return_url text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_wp_connect_tokens_expires on public.wp_connect_tokens(expires_at);
alter table public.wp_connect_tokens enable row level security;
