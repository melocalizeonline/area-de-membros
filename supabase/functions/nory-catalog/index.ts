/**
 * nory-catalog — catálogo de conteúdos desta área de membros para a Nory.
 *
 * A Nory (form do produto digital) lista aqui os produtos desta área de membros
 * para o lojista escolher o "Conteúdo" a liberar. Comunicação SIMÉTRICA ao
 * webhook: valida x-nory-signature (HMAC-SHA256 sobre "<ts>.<body>") com o MESMO
 * secret gravado na conexão (provider 'nory') — sem credencial nova.
 *
 * Rota:   GET /functions/v1/nory-catalog/{tenantId}
 * Header: x-nory-signature: t=<unix_ts>,v1=<hmac(secret,"<ts>.<body>")>
 * Resp.:  { items: [{ id, nome, slug, tipo, ativo }, ...] }
 *
 * Resolução do secret (igual gateway-webhook):
 *   tenant_integrations(tenant_id, provider='nory') → id
 *   tenant_integration_secrets(integration_id) → credentials.secret
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nory-signature",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Valida x-nory-signature — mesmo esquema do adapter nory.ts (HMAC "ts.body").
function validSignature(header: string, secret: string, rawBody: string): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.trim().split("=")).filter((a) => a.length === 2),
  ) as { t?: string; v1?: string };
  const ts = Number(parts.t);
  const sig = parts.v1 ?? "";
  if (!Number.isFinite(ts) || !sig) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false; // anti-replay 5 min
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  return sig.length === expected.length && sig === expected;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  // tenantId = último segmento do path (.../nory-catalog/<tenantId>)
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const tenantId = segments[segments.length - 1];
  if (!tenantId || tenantId === "nory-catalog") {
    return json(400, { error: "tenantId ausente na URL." });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // 1) Resolver a integração 'nory' deste tenant.
  const { data: integration } = await admin
    .from("tenant_integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", "nory")
    .maybeSingle();

  if (!integration) {
    return json(404, { error: "Integração Nory não encontrada para este tenant." });
  }

  // 2) Buscar o secret HMAC pela integration_id.
  const { data: secretRow } = await admin
    .from("tenant_integration_secrets")
    .select("credentials")
    .eq("integration_id", integration.id)
    .maybeSingle();

  const secret = (secretRow?.credentials as { secret?: string } | null)?.secret ?? "";
  if (!secret) {
    return json(401, { error: "Integração Nory sem credenciais (desconectada)." });
  }

  // 3) Validar a assinatura (corpo vazio no GET).
  const rawBody = await req.text().catch(() => "");
  if (!validSignature(req.headers.get("x-nory-signature") ?? "", secret, rawBody)) {
    return json(401, { error: "Assinatura inválida." });
  }

  // 4) Catálogo do tenant. Colunas reais de products: id, name, slug, status, benefit.
  const { data: produtos, error } = await admin
    .from("products")
    .select("id, name, slug, status, benefit")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) return json(500, { error: error.message });

  const items = (produtos ?? []).map((p: Record<string, unknown>) => ({
    id: String(p.id),
    nome: String(p.name ?? p.slug ?? p.id),
    slug: p.slug ? String(p.slug) : undefined,
    tipo: p.benefit ? String(p.benefit) : undefined, // ex.: "courses"
    ativo: p.status === "published",
  }));

  return json(200, { items });
});
