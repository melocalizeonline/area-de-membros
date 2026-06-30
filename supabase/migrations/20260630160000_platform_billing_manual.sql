-- Billing pago manual: link de checkout por plano + status 'pending' de assinatura.
--
-- Tenant paga por um link configuravel (Nory ou outro) e o Superadmin ativa o
-- plano manualmente. 'pending' = pagamento iniciado, aguardando ativacao (sem acesso).

-- 1. Link de checkout por plano pago.
ALTER TABLE public.platform_plans
  ADD COLUMN IF NOT EXISTS checkout_url text;

-- 2. Inclui 'pending' no CHECK de status da assinatura.
ALTER TABLE public.platform_subscriptions
  DROP CONSTRAINT IF EXISTS platform_subscriptions_status_check;

ALTER TABLE public.platform_subscriptions
  ADD CONSTRAINT platform_subscriptions_status_check
  CHECK (status IN ('free', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'pending'));
