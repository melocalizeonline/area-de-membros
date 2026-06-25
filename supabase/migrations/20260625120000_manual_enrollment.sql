-- Matrícula manual (sem checkout): toggle por tenant.
-- Quando ligado, o admin pode conceder acesso a produtos/cursos manualmente.
alter table public.tenant_settings
  add column if not exists allow_manual_enrollment boolean not null default false;

comment on column public.tenant_settings.allow_manual_enrollment is
  'Permite ao admin conceder acesso a produtos/cursos manualmente, sem passar por checkout.';
