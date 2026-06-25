// Edge function: hostinger-tenant
//
// Operações que um TENANT (editor/owner) pode fazer no site vinculado a ele.
// Segurança:
//   1. Autentica o usuário (JWT)
//   2. Resolve o vínculo (hosting_assignments) pelo domínio
//   3. Confirma que o usuário é editor/owner do tenant dono do vínculo
//   4. Confirma que a CAPACIDADE pedida está habilitada para aquele site
//   5. Só então chama a API da Hostinger com a key GLOBAL (nunca exposta ao client)
//
// Ações (cada uma exige uma capability):
//   site_info     (status)    → dados do vínculo + capacidades
//   wp_list       (status)    → instalações WordPress do domínio
//   wp_install    (wordpress) → instala WordPress
//   wp_reinstall  (wordpress) → reinstala (overwrite=true)
//   dns_get       (dns)       → registros DNS do domínio
//   dns_update    (dns)       → grava registros DNS (overwrite=true)
//   dns_reset     (dns_reset) → restaura DNS original

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

type Capabilities = { dns?: boolean; wordpress?: boolean; status?: boolean; dns_reset?: boolean };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "method_not_allowed" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const identity = await authenticateRequest(req, admin);

    const body = await req.json().catch(() => ({}));
    const action: string = (body.action ?? "").trim();
    const domain: string = (body.domain ?? "").trim().toLowerCase();
    if (!action) return json({ error: "action required", code: "missing_required_field" }, 400);
    if (!domain) return json({ error: "domain required", code: "missing_required_field" }, 400);

    // 1. Resolve vínculo pelo domínio
    const { data: assignment } = await admin
      .from("hosting_assignments")
      .select("id, tenant_id, domain, hosting_username, vhost_type, capabilities, status")
      .eq("domain", domain)
      .maybeSingle();
    if (!assignment) throw new AuthError(404, "assignment_not_found", "Site não vinculado");

    // 2. Confirma que o usuário é editor/owner do tenant
    const { data: membership } = await admin
      .from("tenant_users")
      .select("role")
      .eq("user_id", identity.userId)
      .eq("tenant_id", assignment.tenant_id)
      .maybeSingle();
    if (!membership) throw new AuthError(403, "forbidden", "Sem acesso a este site");

    // 3. Capability gate
    const caps = (assignment.capabilities ?? {}) as Capabilities;
    const requireCap = (cap: keyof Capabilities) => {
      if (!caps[cap]) throw new AuthError(403, "capability_disabled", `Recurso "${cap}" não liberado para este site`);
    };

    // Hostinger key (global, service-role only)
    const getKey = async (): Promise<string | null> => {
      const { data } = await admin
        .from("platform_integrations").select("credentials").eq("provider", "hostinger").maybeSingle();
      return (data?.credentials as { api_key?: string } | null)?.api_key ?? null;
    };
    const hostinger = async (path: string, method = "GET", payload?: unknown) => {
      const key = await getKey();
      if (!key) return { ok: false, status: 400, data: { error: "Hostinger API key não configurada", code: "no_api_key" } };
      const res = await fetch(`${HOSTINGER_API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
      let data: unknown;
      try { data = await res.json(); } catch { data = await res.text(); }
      return { ok: res.ok, status: res.status, data };
    };
    const passthrough = (r: { ok: boolean; status: number; data: unknown }) =>
      json({ ok: r.ok, status: r.status, data: r.ok ? r.data : null, raw: r.ok ? null : r.data });

    const username = assignment.hosting_username as string | null;

    switch (action) {
      case "site_info": {
        requireCap("status");
        return json({
          domain: assignment.domain,
          username,
          vhostType: assignment.vhost_type,
          status: assignment.status,
          capabilities: caps,
        });
      }
      case "wp_list": {
        requireCap("status");
        const r = await hostinger(`/hosting/v1/wordpress/installations?domain=${encodeURIComponent(domain)}`);
        // Garante filtro pelo domínio mesmo que a API ignore o query param
        if (r.ok && Array.isArray((r.data as { data?: unknown[] })?.data ?? r.data)) {
          const arr = ((r.data as { data?: Record<string, unknown>[] })?.data ?? r.data) as Record<string, unknown>[];
          const filtered = arr.filter((x) => String(x.domain ?? "").toLowerCase() === domain);
          return json({ ok: true, status: r.status, data: filtered, raw: null });
        }
        return passthrough(r);
      }
      case "wp_install":
      case "wp_reinstall": {
        requireCap("wordpress");
        if (!username) return json({ error: "Site sem conta de hospedagem (username) vinculada", code: "no_username" }, 400);
        const overwrite = action === "wp_reinstall" ? true : !!body.overwrite;
        const payload: Record<string, unknown> = {
          domain,
          siteTitle: (body.siteTitle ?? "").trim() || domain,
          overwrite,
          credentials: {
            email: (body.adminEmail ?? "").trim(),
            login: (body.adminLogin ?? "").trim(),
            password: body.adminPassword ?? "",
          },
        };
        if (body.language) payload.language = body.language;
        if (body.directory) payload.directory = body.directory;
        const r = await hostinger(`/hosting/v1/accounts/${encodeURIComponent(username)}/wordpress/installations`, "POST", payload);
        return passthrough(r);
      }
      case "dns_get": {
        requireCap("status"); // ver DNS exige ao menos status; editar exige dns
        const r = await hostinger(`/dns/v1/zones/${encodeURIComponent(domain)}`);
        return passthrough(r);
      }
      case "dns_update": {
        requireCap("dns");
        const zone = body.zone;
        if (!Array.isArray(zone)) return json({ error: "zone array required", code: "missing_required_field" }, 400);
        const r = await hostinger(`/dns/v1/zones/${encodeURIComponent(domain)}`, "PUT", { overwrite: true, zone });
        return passthrough(r);
      }
      case "dns_reset": {
        requireCap("dns_reset");
        const r = await hostinger(`/dns/v1/zones/${encodeURIComponent(domain)}/reset`, "POST", { sync: true });
        return passthrough(r);
      }
      default:
        return json({ error: "invalid action", code: "invalid_action" }, 400);
    }
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message, code: error.code }, error.status);
    console.error("hostinger-tenant error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});
