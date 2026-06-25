-- ── Capacidades por site + dados de hosting para vínculos ──
-- capabilities: quais recursos o tenant pode usar naquele site específico.
--   { "dns": bool, "wordpress": bool, "status": bool, "dns_reset": bool }
-- hosting_username: conta de hospedagem (necessária para endpoints /accounts/{username}/...)
-- vhost_type: tipo de virtual host retornado pela Hostinger (main/addon/etc).

alter table public.hosting_assignments
  add column if not exists capabilities jsonb not null default '{}'::jsonb,
  add column if not exists hosting_username text,
  add column if not exists vhost_type text;
