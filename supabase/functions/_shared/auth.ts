import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ── Types ────────────────────────────────────────────

export interface AuthIdentity {
  userId: string;
  method: "jwt" | "api_key";
  keyId?: string;
  keyTenantId?: string;
}

export interface WorkspaceAuth extends AuthIdentity {
  tenantId: string;
  role: "owner" | "editor";
}

export interface AuthorizeOptions {
  minRole?: "editor" | "owner";
  jwtOnly?: boolean;
}

// ── AuthError ────────────────────────────────────────

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

// ── Helpers ──────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── authenticateRequest ──────────────────────────────

/**
 * Resolve identidade a partir do header Authorization.
 * Retorna userId + method. Para API Keys, inclui keyId e keyTenantId.
 * Throw AuthError(401) se inválido.
 */
export async function authenticateRequest(
  req: Request,
  adminClient: SupabaseClient
): Promise<AuthIdentity> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(401, "missing_authorization", "Missing authorization");
  }

  const token = authHeader.replace("Bearer ", "");

  // 1. JWT — tokens possuem segmentos separados por "."
  if (token.includes(".")) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error,
    } = await userClient.auth.getUser(token);
    if (error || !user) {
      throw new AuthError(401, "invalid_auth_token", "Invalid token");
    }
    return { userId: user.id, method: "jwt" };
  }

  // 2. API Key — formato sk_live_<hex>
  if (token.startsWith("sk_live_")) {
    const keyHash = await sha256Hex(token);
    const { data } = await adminClient.rpc("validate_api_key", {
      p_key_hash: keyHash,
    });

    if (!data || data.length === 0) {
      throw new AuthError(401, "invalid_api_key", "Invalid API key");
    }

    const row = data[0];
    return {
      userId: row.user_id,
      method: "api_key",
      keyId: row.key_id,
      keyTenantId: row.tenant_id,
    };
  }

  throw new AuthError(401, "invalid_auth_format", "Invalid authorization format");
}

// ── authorizeWorkspace ───────────────────────────────

/**
 * Verifica se o principal (JWT ou API Key) tem acesso ao workspace.
 * Throw AuthError(401) se jwtOnly e veio API Key.
 * Throw AuthError(403) se tenant lock falhar, sem role, ou role insuficiente.
 */
export async function authorizeWorkspace(
  identity: AuthIdentity,
  tenantId: string,
  adminClient: SupabaseClient,
  options?: AuthorizeOptions
): Promise<WorkspaceAuth> {
  const { minRole = "editor", jwtOnly = false } = options ?? {};

  // JWT-only check
  if (jwtOnly && identity.method === "api_key") {
    throw new AuthError(401, "api_keys_not_accepted", "API keys not accepted on this endpoint");
  }

  // Tenant lock — API Key só funciona no workspace ao qual pertence
  if (identity.method === "api_key" && identity.keyTenantId !== tenantId) {
    throw new AuthError(403, "wrong_workspace_key", "This key belongs to another workspace");
  }

  // Resolve role via tenant_users
  const { data: membership, error: membershipError } = await adminClient
    .from("tenant_users")
    .select("role")
    .eq("user_id", identity.userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (membershipError) {
    throw new AuthError(500, "permission_check_failed", "Failed to verify permissions");
  }

  if (!membership) {
    throw new AuthError(403, "forbidden_workspace", "No permission on this workspace");
  }

  const role = membership.role as "owner" | "editor";

  // Role check
  if (minRole === "owner" && role !== "owner") {
    throw new AuthError(403, "owner_required", "You must be the workspace owner");
  }

  return {
    ...identity,
    tenantId,
    role,
  };
}

// ── assertTenantActive ───────────────────────────────

/**
 * Enforcement de account_status (Fase 5 — defesa no backend).
 * Bloqueia acoes de escrita quando a conta do tenant nao esta ativa.
 * Por padrao bloqueia paused/blocked/cancelled; passe allowPaused p/ liberar paused.
 * Throw AuthError(403) se inativo.
 */
export async function assertTenantActive(
  adminClient: SupabaseClient,
  tenantId: string,
  options?: { allowPaused?: boolean }
): Promise<void> {
  const { data, error } = await adminClient
    .from("tenant_settings")
    .select("account_status")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    throw new AuthError(500, "status_check_failed", "Failed to verify account status");
  }

  const status = (data?.account_status as string | undefined) ?? "active";
  if (status === "active") return;
  if (status === "paused" && options?.allowPaused) return;

  throw new AuthError(403, "tenant_inactive", `A conta deste workspace está ${status}.`);
}

// ── toErrorResponse ──────────────────────────────────

/**
 * Converte erro em Response HTTP. AuthError → status + code; outros → 500 + internal_error.
 * Always includes a `code` field for frontend i18n mapping.
 */
export function toErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>
): Response {
  if (err instanceof AuthError) {
    return new Response(
      JSON.stringify({ error: err.message, code: err.code }),
      {
        status: err.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const message = (err as Error).message || "Internal server error";
  return new Response(
    JSON.stringify({ error: message, code: "internal_error" }),
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
