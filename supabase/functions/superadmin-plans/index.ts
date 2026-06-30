// Edge function: superadmin-plans (somente platform admin / role 'admin')
//
// Configuracao dos planos da plataforma (platform_plans). Toda mutacao grava
// em superadmin_audit_logs. Service role interno; autorizacao via is_admin.
//
// Acoes:
//   list_plans          {}                                  -> todos os planos (incl. inativos)
//   update_plan_config  { key, patch }                      -> atualiza um plano

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { authenticateRequest, AuthError, toErrorResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const EDITABLE_FIELDS = ["name", "description", "price_cents", "currency", "is_active", "features", "limits", "sort_order"] as const;

async function writeAudit(
  admin: SupabaseClient,
  actor: string,
  targetId: string | null,
  action: string,
  before: unknown,
  after: unknown,
) {
  const { error } = await admin.from("superadmin_audit_logs").insert({
    actor_user_id: actor,
    tenant_id: null,
    target_type: "platform_plan",
    target_id: targetId,
    action,
    before_data: before ?? null,
    after_data: after ?? null,
    metadata: {},
  });
  if (error) console.error("superadmin-plans: audit insert failed:", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "method_not_allowed" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const identity = await authenticateRequest(req, admin);

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", identity.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new AuthError(403, "forbidden", "Apenas o admin da plataforma");

    const body = await req.json().catch(() => ({}));
    const action: string = (body.action ?? "").trim();

    switch (action) {
      case "list_plans": {
        const { data, error } = await admin
          .from("platform_plans")
          .select("id, key, name, description, price_cents, currency, is_active, sort_order, features, limits, updated_at")
          .order("sort_order");
        if (error) throw error;
        return json({ plans: data ?? [] });
      }

      case "update_plan_config": {
        const key = (body.key ?? "").trim();
        const patch = body.patch ?? {};
        if (!key) return json({ error: "key is required", code: "missing_required_field" }, 400);
        if (typeof patch !== "object" || Array.isArray(patch))
          return json({ error: "patch invalido", code: "invalid_patch" }, 400);

        const update: Record<string, unknown> = {};
        for (const field of EDITABLE_FIELDS) {
          if (patch[field] === undefined) continue;
          if (field === "price_cents" || field === "sort_order") {
            const n = Number(patch[field]);
            if (!Number.isFinite(n) || n < 0) return json({ error: `${field} invalido`, code: "invalid_value" }, 400);
            update[field] = Math.round(n);
          } else if (field === "is_active") {
            update[field] = !!patch[field];
          } else if (field === "features" || field === "limits") {
            if (typeof patch[field] !== "object" || patch[field] === null || Array.isArray(patch[field]))
              return json({ error: `${field} invalido`, code: "invalid_value" }, 400);
            update[field] = patch[field];
          } else {
            update[field] = String(patch[field]);
          }
        }
        if (Object.keys(update).length === 0)
          return json({ error: "Nada para atualizar", code: "nothing_to_update" }, 400);

        const { data: before } = await admin
          .from("platform_plans").select("*").eq("key", key).maybeSingle();
        if (!before) return json({ error: "Plano nao encontrado", code: "plan_not_found" }, 404);

        const { data: after, error } = await admin
          .from("platform_plans").update(update).eq("key", key)
          .select("id, key, name, description, price_cents, currency, is_active, sort_order, features, limits, updated_at")
          .maybeSingle();
        if (error) throw error;

        await writeAudit(admin, identity.userId, before.id, "update_plan_config", before, after);
        return json({ success: true, plan: after });
      }

      default:
        return json({ error: "invalid action", code: "invalid_action" }, 400);
    }
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message, code: error.code }, error.status);
    console.error("superadmin-plans error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});
