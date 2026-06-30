import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

export interface PlatformSubscription {
  id: string;
  tenant_id: string;
  plan_key: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Assinatura da plataforma do tenant (platform_subscriptions).
 * Fonte do estado de billing que dirige o plan gate no ProtectedRoute.
 */
export function useSubscription() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscription", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("platform_subscriptions")
        .select("id, tenant_id, plan_key, status, trial_ends_at, current_period_end, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;
      return (data as PlatformSubscription) ?? null;
    },
    enabled: !!tenantId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const status = subscription?.status ?? null;
  const isTrialing = status === "trialing";
  const trialExpired =
    isTrialing &&
    !!subscription?.trial_ends_at &&
    new Date(subscription.trial_ends_at).getTime() <= Date.now();

  // Periodo pago vencido (validade lazy, sem cron).
  const periodEnded =
    !!subscription?.current_period_end &&
    new Date(subscription.current_period_end).getTime() <= Date.now();

  // Assinatura valida (libera acesso ao painel): free, active no periodo, ou trial nao expirado.
  const isValid =
    status === "free" ||
    (status === "active" && !periodEnded) ||
    (isTrialing && !trialExpired);

  return {
    subscription: subscription ?? null,
    status,
    planKey: subscription?.plan_key ?? null,
    isValid,
    isTrialing,
    trialExpired,
    isPending: status === "pending",
    isActive: status === "active",
    isPastDue: status === "past_due",
    isCanceled: status === "canceled",
    // compat com consumidores legados (UpgradeModal)
    willCancel: false,
    plan: null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
