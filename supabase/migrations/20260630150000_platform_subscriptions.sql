-- Selecao obrigatoria de plano pos-login.
--
-- 1. platform_plans ganha plan_type (free/trial/paid) + trial_days.
-- 2. platform_subscriptions: assinatura da plataforma por tenant (estado de billing,
--    separado do account_status operacional). Sem backfill — tenants existentes sem
--    assinatura sao forcados a escolher um plano no proximo login.

-- =====================================================================
-- 1. platform_plans: tipo e dias de teste
-- =====================================================================

ALTER TABLE public.platform_plans
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_plans_plan_type_check') THEN
    ALTER TABLE public.platform_plans
      ADD CONSTRAINT platform_plans_plan_type_check
      CHECK (plan_type IN ('free', 'trial', 'paid'));
  END IF;
END $$;

-- Classifica os seeds base (so se ainda estiverem no default).
UPDATE public.platform_plans SET plan_type = 'free' WHERE key = 'free' AND plan_type = 'paid';
-- pro/business permanecem 'paid' (default).

-- =====================================================================
-- 2. platform_subscriptions
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_key text NOT NULL,
  status text NOT NULL DEFAULT 'free',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_subscriptions_status_check
    CHECK (status IN ('free', 'trialing', 'active', 'past_due', 'canceled', 'expired'))
);

CREATE INDEX IF NOT EXISTS platform_subscriptions_tenant_idx
  ON public.platform_subscriptions (tenant_id);

DROP TRIGGER IF EXISTS set_platform_subscriptions_updated_at ON public.platform_subscriptions;
CREATE TRIGGER set_platform_subscriptions_updated_at
  BEFORE UPDATE ON public.platform_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- Leitura: membros do tenant (owner/editor) ou platform admin. Escritas: service role.
DROP POLICY IF EXISTS "platform_subscriptions_select_member" ON public.platform_subscriptions;
CREATE POLICY "platform_subscriptions_select_member"
  ON public.platform_subscriptions FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = platform_subscriptions.tenant_id
        AND tu.user_id = auth.uid()
    )
  );
