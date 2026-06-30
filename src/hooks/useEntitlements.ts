import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

/**
 * Camada central de entitlements (Fase 0 — fundacao comercial).
 *
 * Resolve os recursos disponiveis para o tenant a partir de `platform_plans`
 * (configuravel pelo Superadmin em /superadmin/plans) pelo `plan` do tenant,
 * substituindo as checagens hardcoded espalhadas (`plan === "pro" || "business"`).
 *
 * Mantem compatibilidade: enquanto o plano nao carrega (ou se a linha nao existe),
 * usa o fallback historico "qualquer plano pago libera" para nao piscar / regredir.
 */

export type FeatureKey =
  | "ai_captions"
  | "caption_display"
  | "video_protection"
  | "video_progress_tracking"
  | "manual_enrollment"
  | "hosting";

interface PlanRow {
  features: Record<string, unknown> | null;
  limits: Record<string, unknown> | null;
}

export function useEntitlements() {
  const { tenant } = useTenant();
  const planKey = (tenant?.plan as string | undefined) ?? "free";

  const { data: plan, isLoading } = useQuery({
    queryKey: ["platform_plan", planKey],
    enabled: !!planKey,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PlanRow | null> => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("features, limits")
        .eq("key", planKey)
        .maybeSingle();
      if (error) throw error;
      return (data as PlanRow) ?? null;
    },
  });

  const loaded = !!plan;
  const features = (plan?.features ?? {}) as Record<string, unknown>;
  const limits = (plan?.limits ?? {}) as Record<string, number>;
  const integrations = (features.integrations ?? {}) as Record<string, boolean>;

  // Fallback historico (enquanto platform_plans nao carrega): espelha o check
  // hardcoded antigo `plan === "pro" || "business"` para nao regredir.
  const isPaidPlan = planKey === "pro" || planKey === "business";

  /** Recurso premium liberado para o plano do tenant. */
  const hasFeature = (key: FeatureKey): boolean =>
    loaded ? !!features[key] : isPaidPlan;

  /** Integracao (openai/anthropic/hotmart/nory/vimeo/pandavideo/wistia) liberada. */
  const hasIntegration = (provider: string): boolean =>
    loaded ? !!integrations[provider] : true;

  /** Limite numerico do plano (-1 = ilimitado, undefined = nao definido). */
  const limit = (key: string): number | undefined =>
    typeof limits[key] === "number" ? limits[key] : undefined;

  return {
    plan: planKey,
    isPro: hasFeature("video_protection"),
    features,
    limits,
    hasFeature,
    hasIntegration,
    limit,
    isLoading,
  };
}
