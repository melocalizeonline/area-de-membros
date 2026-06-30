-- Superadmin Fase 1: status de conta do tenant, planos da plataforma e audit logs.
--
-- 1. tenant_settings.account_status (+ reason + updated_at) com CHECK.
-- 2. platform_plans: definicoes de plano configuraveis (features/limits em jsonb).
-- 3. superadmin_audit_logs: trilha de auditoria de toda acao administrativa.

-- =====================================================================
-- 1. Account status no tenant_settings
-- =====================================================================

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS account_status_reason text,
  ADD COLUMN IF NOT EXISTS account_status_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_settings_account_status_check'
  ) THEN
    ALTER TABLE public.tenant_settings
      ADD CONSTRAINT tenant_settings_account_status_check
      CHECK (account_status IN ('active', 'paused', 'blocked', 'cancelled'));
  END IF;
END $$;

-- =====================================================================
-- 2. Planos da plataforma
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_platform_plans_updated_at ON public.platform_plans;
CREATE TRIGGER set_platform_plans_updated_at
  BEFORE UPDATE ON public.platform_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seeds dos planos base (idempotente: nao sobrescreve config ja editada pelo admin).
INSERT INTO public.platform_plans (key, name, description, price_cents, sort_order, features, limits)
VALUES
  (
    'free', 'Free', 'Plano inicial para comecar a area de membros.', 0, 0,
    '{
      "ai_captions": false,
      "caption_display": false,
      "video_protection": false,
      "video_progress_tracking": false,
      "manual_enrollment": false,
      "hosting": false,
      "integrations": {
        "openai": false, "anthropic": false, "hotmart": true, "nory": true,
        "vimeo": true, "pandavideo": true, "wistia": true
      }
    }'::jsonb,
    '{ "team_members": 1, "customers": 100, "storage_gb": 5, "courses": 3 }'::jsonb
  ),
  (
    'pro', 'Pro', 'Plano profissional com recursos de video e automacao.', 9700, 1,
    '{
      "ai_captions": true,
      "caption_display": true,
      "video_protection": true,
      "video_progress_tracking": true,
      "manual_enrollment": true,
      "hosting": false,
      "integrations": {
        "openai": true, "anthropic": true, "hotmart": true, "nory": true,
        "vimeo": true, "pandavideo": true, "wistia": true
      }
    }'::jsonb,
    '{ "team_members": 3, "customers": 5000, "storage_gb": 50, "courses": 50 }'::jsonb
  ),
  (
    'business', 'Business', 'Plano avancado com hospedagem e limites ampliados.', 29700, 2,
    '{
      "ai_captions": true,
      "caption_display": true,
      "video_protection": true,
      "video_progress_tracking": true,
      "manual_enrollment": true,
      "hosting": true,
      "integrations": {
        "openai": true, "anthropic": true, "hotmart": true, "nory": true,
        "vimeo": true, "pandavideo": true, "wistia": true
      }
    }'::jsonb,
    '{ "team_members": 10, "customers": 100000, "storage_gb": 500, "courses": -1 }'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

-- Leitura: definicoes de plano nao sao sensiveis (o produto resolve features a partir delas).
DROP POLICY IF EXISTS "platform_plans_select_authenticated" ON public.platform_plans;
CREATE POLICY "platform_plans_select_authenticated"
  ON public.platform_plans FOR SELECT
  TO authenticated
  USING (true);

-- Escrita: somente platform admin (writes da edge function usam service role, que ignora RLS).
DROP POLICY IF EXISTS "platform_plans_admin_write" ON public.platform_plans;
CREATE POLICY "platform_plans_admin_write"
  ON public.platform_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- 3. Audit logs do superadmin
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.superadmin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id uuid,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS superadmin_audit_logs_tenant_idx
  ON public.superadmin_audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS superadmin_audit_logs_created_idx
  ON public.superadmin_audit_logs (created_at DESC);

ALTER TABLE public.superadmin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Leitura: somente platform admin. Escrita: somente service role (edge function).
DROP POLICY IF EXISTS "superadmin_audit_logs_select_admin" ON public.superadmin_audit_logs;
CREATE POLICY "superadmin_audit_logs_select_admin"
  ON public.superadmin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
