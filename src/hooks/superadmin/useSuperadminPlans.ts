import { useQuery } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/lib/edge-function-utils";

export interface PlanFeatures {
  ai_captions?: boolean;
  caption_display?: boolean;
  video_protection?: boolean;
  video_progress_tracking?: boolean;
  manual_enrollment?: boolean;
  hosting?: boolean;
  integrations?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface PlanLimits {
  team_members?: number;
  customers?: number;
  storage_gb?: number;
  courses?: number;
  [key: string]: unknown;
}

export type PlanType = "free" | "trial" | "paid";

export interface PlatformPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
  plan_type: PlanType;
  trial_days: number;
  checkout_url: string | null;
  features: PlanFeatures;
  limits: PlanLimits;
  updated_at: string;
}

export interface PlanConfigPatch {
  name?: string;
  description?: string;
  price_cents?: number;
  currency?: string;
  is_active?: boolean;
  plan_type?: PlanType;
  trial_days?: number;
  checkout_url?: string;
  features?: PlanFeatures;
  limits?: PlanLimits;
  sort_order?: number;
}

const FN = "superadmin-plans";

export function useSuperadminPlans() {
  return useQuery({
    queryKey: ["superadmin_plans_config"],
    staleTime: 10_000,
    queryFn: async () => {
      const { data } = await invokeEdgeFunction<{ plans: PlatformPlan[] }>(FN, {
        body: { action: "list_plans" },
      });
      return data.plans;
    },
  });
}

export async function updatePlanConfig(key: string, patch: PlanConfigPatch): Promise<PlatformPlan> {
  const { data } = await invokeEdgeFunction<{ plan: PlatformPlan }>(FN, {
    body: { action: "update_plan_config", key, patch },
  });
  return data.plan;
}
