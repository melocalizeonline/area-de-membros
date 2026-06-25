// Edge function: resolve-access-request
//
// Admin aprova ou recusa uma solicitação de acesso a curso.
// Aprovar → concede o acesso (course_customers) e marca status='approved'.
// Recusar → marca status='rejected'.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  authenticateRequest,
  authorizeWorkspace,
  toErrorResponse,
  AuthError,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  }

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const identity = await authenticateRequest(req, admin);

    const body = await req.json();
    const tenantId: string = (body.tenantId ?? "").trim();
    const requestId: string = (body.requestId ?? "").trim();
    const action: string = (body.action ?? "").trim();

    if (!tenantId || !requestId || (action !== "approve" && action !== "reject")) {
      return jsonResponse({ error: "tenantId, requestId and valid action are required", code: "missing_required_field" }, 400);
    }

    await authorizeWorkspace(identity, tenantId, admin, { minRole: "editor" });

    const { data: request } = await admin
      .from("access_requests")
      .select("id, tenant_id, course_id, product_id, user_id, status")
      .eq("id", requestId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!request) {
      return jsonResponse({ error: "Request not found", code: "request_not_found" }, 404);
    }

    if (action === "approve") {
      if (request.course_id) {
        // Acesso direto ao curso
        const { error: ccError } = await admin
          .from("course_customers")
          .upsert(
            { course_id: request.course_id, user_id: request.user_id },
            { onConflict: "course_id,user_id", ignoreDuplicates: true },
          );
        if (ccError) throw ccError;
      } else if (request.product_id) {
        // Acesso ao produto = pedido manual (trigger libera os cursos vinculados)
        const { data: customer } = await admin
          .from("customers")
          .select("id, email")
          .eq("tenant_id", tenantId)
          .eq("user_id", request.user_id)
          .maybeSingle();

        const { data: existing } = await admin
          .from("orders")
          .select("id, status")
          .eq("tenant_id", tenantId)
          .eq("customer_id", customer?.id ?? null)
          .eq("product_id", request.product_id)
          .eq("source", "manual")
          .maybeSingle();

        if (existing) {
          if (existing.status !== "completed") {
            await admin.from("orders").update({ status: "completed" }).eq("id", existing.id);
          }
        } else {
          const { error: ordError } = await admin.from("orders").insert({
            tenant_id: tenantId,
            customer_id: customer?.id ?? null,
            product_id: request.product_id,
            status: "completed",
            source: "manual",
            payment_method: "free",
            unit_amount: 0,
            currency: "BRL",
            customer_email_snapshot: customer?.email ?? null,
          });
          if (ordError) throw ordError;
        }
      }
    }

    const { error: updError } = await admin
      .from("access_requests")
      .update({ status: action === "approve" ? "approved" : "rejected", updated_at: new Date().toISOString() })
      .eq("id", requestId);
    if (updError) throw updError;

    return jsonResponse({ success: true, status: action === "approve" ? "approved" : "rejected" });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message, code: error.code }, error.status);
    }
    console.error("resolve-access-request error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});
