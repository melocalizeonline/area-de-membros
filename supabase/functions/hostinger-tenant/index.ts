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
//   dns_validate  (dns)       → valida a zona antes de salvar
//   dns_snapshots (dns)       → lista snapshots (histórico) do DNS
//   dns_snapshot_get     (dns)       → detalhe de um snapshot
//   dns_snapshot_restore (dns_reset) → restaura um snapshot
//   subdomains_list   (subdomains) → lista subdomínios do site
//   subdomain_create  (subdomains) → cria subdomínio
//   subdomain_delete  (subdomains) → exclui subdomínio
//   wp_connect_start  (wp_manage)  → inicia authorize-application (retorna URL)
//   wp_status / wp_disconnect (wp_manage) → estado / remove conexão WP
//   wp_plugins_list / wp_plugin_set_status / wp_plugin_install / wp_plugin_delete (wp_manage)
//   wp_themes_list    (wp_manage)  → lista temas (somente leitura)

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

type Capabilities = { dns?: boolean; wordpress?: boolean; status?: boolean; dns_reset?: boolean; subdomains?: boolean; wp_manage?: boolean };

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
      case "dns_validate": {
        requireCap("dns");
        const zone = body.zone;
        if (!Array.isArray(zone)) return json({ error: "zone array required", code: "missing_required_field" }, 400);
        const r = await hostinger(`/dns/v1/zones/${encodeURIComponent(domain)}/validate`, "POST", { overwrite: true, zone });
        return passthrough(r);
      }
      case "dns_snapshots": {
        requireCap("dns"); // ver histórico exige acesso a DNS
        const r = await hostinger(`/dns/v1/snapshots/${encodeURIComponent(domain)}`);
        return passthrough(r);
      }
      case "dns_snapshot_get": {
        requireCap("dns");
        const id = String(body.snapshotId ?? "").trim();
        if (!id) return json({ error: "snapshotId required", code: "missing_required_field" }, 400);
        const r = await hostinger(`/dns/v1/snapshots/${encodeURIComponent(domain)}/${encodeURIComponent(id)}`);
        return passthrough(r);
      }
      case "dns_snapshot_restore": {
        requireCap("dns_reset"); // restaurar sobrescreve a zona → mesma gate do reset
        const id = String(body.snapshotId ?? "").trim();
        if (!id) return json({ error: "snapshotId required", code: "missing_required_field" }, 400);
        const r = await hostinger(`/dns/v1/snapshots/${encodeURIComponent(domain)}/${encodeURIComponent(id)}/restore`, "POST", {});
        return passthrough(r);
      }
      case "subdomains_list": {
        requireCap("subdomains");
        if (!username) return json({ error: "Site sem conta de hospedagem (username) vinculada", code: "no_username" }, 400);
        const r = await hostinger(`/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/subdomains`);
        return passthrough(r);
      }
      case "subdomain_create": {
        requireCap("subdomains");
        if (!username) return json({ error: "Site sem conta de hospedagem (username) vinculada", code: "no_username" }, 400);
        const sub = String(body.subdomain ?? "").trim().toLowerCase();
        if (!sub) return json({ error: "subdomain required", code: "missing_required_field" }, 400);
        const payload: Record<string, unknown> = { subdomain: sub };
        if (body.directory) payload.directory = String(body.directory).trim();
        if (typeof body.isUsingPublicDirectory === "boolean") payload.is_using_public_directory = body.isUsingPublicDirectory;
        const r = await hostinger(`/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/subdomains`, "POST", payload);
        return passthrough(r);
      }
      case "subdomain_delete": {
        requireCap("subdomains");
        if (!username) return json({ error: "Site sem conta de hospedagem (username) vinculada", code: "no_username" }, 400);
        const sub = String(body.subdomain ?? "").trim().toLowerCase();
        if (!sub) return json({ error: "subdomain required", code: "missing_required_field" }, 400);
        const r = await hostinger(`/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/subdomains/${encodeURIComponent(sub)}`, "DELETE");
        return passthrough(r);
      }

      /* ─── WordPress (REST do próprio site, via Application Password) ─── */
      case "wp_connect_start": {
        requireCap("wp_manage");
        // Normaliza para https (exigência do WordPress p/ Application Passwords).
        const rawUrl = String(body.wpUrl ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
        if (!rawUrl) return json({ error: "URL do site obrigatória", code: "missing_required_field" }, 400);
        const wpUrl = `https://${rawUrl}`;
        const returnUrl = String(body.returnUrl ?? "").trim() || null;
        // token de uso único (15 min)
        const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
        const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const { error: insErr } = await admin.from("wp_connect_tokens").insert({
          token, tenant_id: assignment.tenant_id, assignment_id: assignment.id,
          domain, wp_url: wpUrl, user_id: identity.userId, return_url: returnUrl, expires_at: expires,
        });
        if (insErr) return json({ error: "Falha ao iniciar conexão", code: "token_insert_failed" }, 500);
        const callback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hostinger-wp-callback?token=${encodeURIComponent(token)}`;
        const authorizeUrl =
          `${wpUrl}/wp-admin/authorize-application.php` +
          `?app_name=${encodeURIComponent("Nory Members")}` +
          `&success_url=${encodeURIComponent(callback)}`;
        return json({ authorizeUrl });
      }
      case "wp_status": {
        requireCap("wp_manage");
        const { data: conn } = await admin
          .from("wp_connections").select("wp_url, wp_user, updated_at")
          .eq("assignment_id", assignment.id).maybeSingle();
        return json({ connected: !!conn, wpUrl: conn?.wp_url ?? null, wpUser: conn?.wp_user ?? null });
      }
      case "wp_disconnect": {
        requireCap("wp_manage");
        await admin.from("wp_connections").delete().eq("assignment_id", assignment.id);
        return json({ ok: true });
      }
      case "wp_plugins_list":
      case "wp_plugin_set_status":
      case "wp_plugin_install":
      case "wp_plugin_delete":
      case "wp_themes_list": {
        requireCap("wp_manage");
        const { data: conn } = await admin
          .from("wp_connections").select("wp_url, wp_user, app_password")
          .eq("assignment_id", assignment.id).maybeSingle();
        if (!conn) return json({ error: "WordPress não conectado", code: "wp_not_connected" }, 400);
        const wpFetch = async (path: string, method = "GET", payload?: unknown) => {
          const auth = btoa(`${conn.wp_user}:${conn.app_password}`);
          const res = await fetch(`${String(conn.wp_url).replace(/\/$/, "")}/wp-json${path}`, {
            method,
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
            body: payload !== undefined ? JSON.stringify(payload) : undefined,
          });
          let data: unknown;
          try { data = await res.json(); } catch { data = await res.text(); }
          return { ok: res.ok, status: res.status, data };
        };

        if (action === "wp_plugins_list") {
          return passthrough(await wpFetch("/wp/v2/plugins?context=edit"));
        }
        if (action === "wp_themes_list") {
          return passthrough(await wpFetch("/wp/v2/themes?context=edit"));
        }
        if (action === "wp_plugin_set_status") {
          const plugin = String(body.plugin ?? "").trim();
          const wpStatus = String(body.status ?? "").trim(); // "active" | "inactive"
          if (!plugin || !["active", "inactive"].includes(wpStatus)) {
            return json({ error: "plugin e status (active|inactive) obrigatórios", code: "missing_required_field" }, 400);
          }
          return passthrough(await wpFetch(`/wp/v2/plugins/${encodeURIComponent(plugin)}`, "PUT", { status: wpStatus }));
        }
        if (action === "wp_plugin_install") {
          const slug = String(body.slug ?? "").trim().toLowerCase();
          if (!slug) return json({ error: "slug obrigatório", code: "missing_required_field" }, 400);
          const activate = body.activate === true;
          return passthrough(await wpFetch("/wp/v2/plugins", "POST", { slug, status: activate ? "active" : "inactive" }));
        }
        // wp_plugin_delete
        const plugin = String(body.plugin ?? "").trim();
        if (!plugin) return json({ error: "plugin obrigatório", code: "missing_required_field" }, 400);
        return passthrough(await wpFetch(`/wp/v2/plugins/${encodeURIComponent(plugin)}`, "DELETE"));
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
