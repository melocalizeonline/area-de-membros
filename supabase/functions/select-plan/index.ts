// Edge function: select-plan (self-service)
//
// Seleciao obrigatoria de plano pos-login. O owner do tenant escolhe um plano
// (free ou trial agora; paid adiado) e cria a assinatura da plataforma.
//
// Body: { tenant_id, plan_key }
//   free  -> platform_subscriptions { status: 'free' }              + tenant_settings.plan
//   trial -> { status: 'trialing', trial_ends_at = now + trial_days } + tenant_settings.plan
//   paid  -> 403 paid_not_available (checkout da plataforma ainda nao existe)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateRequest, authorizeWorkspace, AuthError, toErrorResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "method_not_allowed" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const identity = await authenticateRequest(req, admin);

    const body = await req.json().catch(() => ({}));
    const tenantId: string = (body.tenant_id ?? "").trim();
    const planKey: string = (body.plan_key ?? "").trim();
    if (!tenantId || !planKey) {
      return json({ error: "tenant_id and plan_key are required", code: "missing_required_field" }, 400);
    }

    // So o owner do tenant escolhe o plano.
    await authorizeWorkspace(identity, tenantId, admin, { minRole: "owner", jwtOnly: true });

    // Plano precisa existir e estar ativo.
    const { data: plan } = await admin
      .from("platform_plans")
      .select("key, plan_type, trial_days, is_active, checkout_url")
      .eq("key", planKey)
      .maybeSingle();
    if (!plan || !plan.is_active) {
      return json({ error: "Plano indisponivel", code: "unknown_plan" }, 400);
    }

    const planType = (plan.plan_type as string) ?? "paid";

    if (planType === "paid") {
      // Cobranca manual: registra 'pending' (sem acesso) e devolve o link de
      // checkout. O Superadmin ativa a assinatura apos confirmar o pagamento.
      const { error: pendError } = await admin.from("platform_subscriptions").upsert(
        {
          tenant_id: tenantId,
          plan_key: planKey,
          status: "pending",
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );
      if (pendError) throw pendError;
      return json({ success: true, status: "pending", plan_key: planKey, checkout_url: plan.checkout_url ?? null });
    }

    let status = "free";
    let trialEndsAt: string | null = null;
    if (planType === "trial") {
      status = "trialing";
      const days = Math.max(Number(plan.trial_days) || 0, 0);
      trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error: subError } = await admin.from("platform_subscriptions").upsert(
      {
        tenant_id: tenantId,
        plan_key: planKey,
        status,
        trial_ends_at: trialEndsAt,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (subError) throw subError;

    // Espelha o plano nos entitlements (tenant_settings.plan -> useEntitlements).
    const { error: planSetError } = await admin
      .from("tenant_settings").update({ plan: planKey }).eq("tenant_id", tenantId);
    if (planSetError) throw planSetError;

    return json({ success: true, status, plan_key: planKey, trial_ends_at: trialEndsAt });
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message, code: error.code }, error.status);
    console.error("select-plan error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});
