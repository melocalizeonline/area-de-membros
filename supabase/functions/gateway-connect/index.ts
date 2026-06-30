/**
 * Gateway Connect
 *
 * Conecta qualquer gateway de pagamento. Salva credenciais
 * via RPC connect_integration() (upsert atômico).
 *
 * Body: { provider: string, tenant_id: string, credentials: Record<string, string> }
 * Acesso: usuário autenticado, editor do tenant
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { authenticateRequest, authorizeWorkspace, assertTenantActive, toErrorResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function respond(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    /* ── Auth ── */
    const identity = await authenticateRequest(req, admin);

    /* ── Parse body ── */
    let provider: string;
    let tenantId: string;
    let credentials: Record<string, string>;
    try {
      const body = await req.json();
      provider = body.provider;
      tenantId = body.tenant_id;
      credentials = body.credentials;
    } catch {
      return respond(400, { error: "Invalid request body", code: "invalid_body" });
    }

    if (!provider || !credentials || typeof credentials !== "object") {
      return respond(400, { error: "provider and credentials required", code: "missing_fields" });
    }
    if (!tenantId) {
      return respond(400, { error: "tenant_id is required", code: "missing_required_field" });
    }

    /* ── Verificar permissão de editor ── */
    const auth = await authorizeWorkspace(identity, tenantId, admin, { minRole: "editor" });
    await assertTenantActive(admin, tenantId);

    /* ── Provider-specific: Nory auto-registra o webhook ──
       O tenant cola apenas a Chave de API. Chamamos a API pública da Nory
       para registrar a URL de webhook deste tenant e guardamos só o `secret`
       retornado (é ele que valida as assinaturas dos webhooks). */
    let finalCredentials = credentials;
    if (provider === "nory") {
      const apiKey = (credentials.api_key ?? "").trim();
      if (!apiKey) {
        return respond(400, { error: "api_key is required", code: "missing_api_key" });
      }
      try {
        finalCredentials = await registerNoryWebhook(apiKey, supabaseUrl, tenantId);
      } catch (e) {
        console.error("gateway-connect: nory webhook registration failed:", e);
        return respond(502, {
          error: e instanceof Error ? e.message : "Falha ao registrar webhook na Nory",
          code: "nory_register_failed",
        });
      }
    }

    /* ── Gerar credentials_hint ── */
    // Valores completos ficam em tenant_integration_secrets (service_role only).
    // No hint, campos sensíveis vão mascarados (últimos 4 chars). A sensibilidade
    // é por provider: mesmo nome de campo pode ser público num gateway e secreto
    // noutro (ex.: "api_key" é público na Kiwify, secreto na Greenn).
    const SENSITIVE_KEYS_BY_PROVIDER: Record<string, Set<string>> = {
      nory: new Set(["secret"]),
    };
    const sensitiveKeys = SENSITIVE_KEYS_BY_PROVIDER[provider] ?? new Set<string>();
    const credentialsHint: Record<string, string> = {};
    for (const [key, value] of Object.entries(finalCredentials)) {
      if (typeof value === "string" && value.length > 0) {
        if (sensitiveKeys.has(key) && value.length > 4) {
          credentialsHint[key] = "••••" + value.slice(-4);
        } else {
          credentialsHint[key] = value;
        }
      }
    }

    /* ── Conectar via RPC connect_integration() ── */
    const { data: integration, error } = await admin.rpc("connect_integration", {
      p_tenant_id: tenantId,
      p_provider: provider,
      p_metadata: {},
      p_credentials: finalCredentials,
      p_credentials_hint: credentialsHint,
    });

    if (error) {
      console.error("gateway-connect: error:", error.message);
      return respond(400, { error: error.message, code: "connect_failed" });
    }

    return respond(200, {
      connected: true,
      provider,
      integration: integration?.[0] ?? null,
    });
  } catch (err) {
    console.error("gateway-connect error:", err);
    return toErrorResponse(err, corsHeaders);
  }
});

/* ─── Nory: registro automático de webhook ───────────────────
   POST {NORY_API_BASE_URL}/api/public/v1/webhooks
   Authorization: Bearer <api_key>
   { url, eventos: [...] }  →  { secret }
   Endpoint é idempotente por (tenant, url): reconectar devolve o mesmo
   endpoint + secret, sem duplicar. */
const NORY_WEBHOOK_EVENTS = [
  "order.approved",
  "order.refunded",
  "order.chargeback",
  "order.canceled",
  "subscription.renewed",
  "subscription.past_due",
  "subscription.canceled",
];

async function registerNoryWebhook(
  apiKey: string,
  supabaseUrl: string,
  tenantId: string,
): Promise<Record<string, string>> {
  const base = (Deno.env.get("NORY_API_BASE_URL") ?? "https://app.nory.com.br").replace(/\/$/, "");
  const callbackUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/gateway-webhook/nory/${tenantId}`;

  const resp = await fetch(`${base}/api/public/v1/webhooks`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: callbackUrl, eventos: NORY_WEBHOOK_EVENTS }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    if (resp.status === 401 || resp.status === 403) {
      throw new Error("Chave de API da Nory inválida ou sem permissão.");
    }
    throw new Error(`Nory respondeu ${resp.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  const data = await resp.json().catch(() => ({}));
  const secret = typeof data?.secret === "string" ? data.secret.trim() : "";
  if (!secret) {
    throw new Error("Nory não retornou o secret do webhook.");
  }

  return { secret };
}
