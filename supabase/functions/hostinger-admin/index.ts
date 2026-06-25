// Edge function: hostinger-admin (somente superadmin / platform admin)
//
// Ações:
//   save_key       { apiKey }                  → salva a API key da Hostinger
//   status         {}                          → { configured, hint }
//   list_domains   {}                          → lista domínios da Hostinger
//   list_assignments {}                        → vínculos domínio→tenant + tenants
//   assign         { tenantId, domain, externalId? } → vincula domínio a tenant
//   unassign       { id }                      → remove vínculo

import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateRequest, AuthError, toErrorResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const HOSTINGER_API = "https://developers.hostinger.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "method_not_allowed" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const identity = await authenticateRequest(req, admin);

    // Apenas platform admin (role 'admin')
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", identity.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new AuthError(403, "forbidden", "Apenas o admin da plataforma");

    const body = await req.json().catch(() => ({}));
    const action: string = (body.action ?? "").trim();

    const getKey = async (): Promise<string | null> => {
      const { data } = await admin
        .from("platform_integrations").select("credentials").eq("provider", "hostinger").maybeSingle();
      return (data?.credentials as { api_key?: string } | null)?.api_key ?? null;
    };
    const hostinger = async (path: string) => {
      const key = await getKey();
      if (!key) return { ok: false, status: 400, data: { error: "Hostinger API key não configurada", code: "no_api_key" } };
      const res = await fetch(`${HOSTINGER_API}${path}`, {
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      });
      let data: unknown;
      try { data = await res.json(); } catch { data = await res.text(); }
      return { ok: res.ok, status: res.status, data };
    };

    switch (action) {
      case "save_key": {
        const apiKey = (body.apiKey ?? "").trim();
        if (!apiKey) return json({ error: "apiKey required", code: "missing_required_field" }, 400);
        const { error } = await admin.from("platform_integrations").upsert(
          { provider: "hostinger", credentials: { api_key: apiKey }, status: "active", updated_at: new Date().toISOString() },
          { onConflict: "provider" },
        );
        if (error) throw error;
        return json({ success: true });
      }
      case "status": {
        const key = await getKey();
        return json({ configured: !!key, hint: key ? `••••${key.slice(-4)}` : null });
      }
      case "list_domains": {
        const r = await hostinger("/domains/v1/portfolio");
        return json({ ok: r.ok, status: r.status, domains: r.ok ? r.data : null, raw: r.ok ? null : r.data });
      }
      case "list_tenants": {
        const { data } = await admin
          .from("tenants").select("id, name, slug").order("name");
        return json({ tenants: data ?? [] });
      }
      case "list_requests": {
        const { data } = await admin
          .from("hosting_requests")
          .select("id, tenant_id, note, status, created_at, tenants(name, slug)")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        return json({ requests: data ?? [] });
      }
      case "resolve_request": {
        const id = (body.id ?? "").trim();
        const status = (body.status ?? "").trim();
        if (!id || !["approved", "rejected"].includes(status))
          return json({ error: "id and valid status required", code: "missing_required_field" }, 400);
        const { error } = await admin.from("hosting_requests")
          .update({ status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }
      case "list_assignments": {
        const { data } = await admin
          .from("hosting_assignments")
          .select("id, tenant_id, domain, provider, external_id, status, created_at, tenants(name, slug)")
          .order("created_at", { ascending: false });
        return json({ assignments: data ?? [] });
      }
      case "assign": {
        const tenantId = (body.tenantId ?? "").trim();
        const domain = (body.domain ?? "").trim();
        if (!tenantId || !domain) return json({ error: "tenantId and domain required", code: "missing_required_field" }, 400);
        const { error } = await admin.from("hosting_assignments").upsert(
          { tenant_id: tenantId, domain, provider: "hostinger", external_id: body.externalId ?? null, status: "active", updated_at: new Date().toISOString() },
          { onConflict: "domain" },
        );
        if (error) throw error;
        return json({ success: true });
      }
      case "unassign": {
        const id = (body.id ?? "").trim();
        if (!id) return json({ error: "id required", code: "missing_required_field" }, 400);
        const { error } = await admin.from("hosting_assignments").delete().eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }
      default:
        return json({ error: "invalid action", code: "invalid_action" }, 400);
    }
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message, code: error.code }, error.status);
    console.error("hostinger-admin error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});
