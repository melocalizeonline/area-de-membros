// Edge function: enroll-customer
//
// Matrícula manual (sem checkout). Concede ou revoga acesso de um customer a
// produtos e/ou cursos, desde que o tenant tenha `allow_manual_enrollment` ligado.
//
// Produtos  → cria/atualiza um pedido manual (status=completed, source=manual,
//             payment_method=free). O trigger handle_order_access concede o acesso
//             aos cursos vinculados e o produto aparece no portal do aluno.
// Cursos    → acesso direto via course_customers (curso avulso, sem produto).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  authenticateRequest,
  authorizeWorkspace,
  assertTenantActive,
  assertActiveSubscription,
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const identity = await authenticateRequest(req, admin);

    const body = await req.json();
    const tenantId: string = (body.tenantId ?? "").trim();
    const customerId: string = (body.customerId ?? "").trim();
    const email: string = (body.email ?? "").trim().toLowerCase();
    const action: string = (body.action ?? "grant").trim();
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    const courseIds: string[] = Array.isArray(body.courseIds) ? body.courseIds : [];

    if (!tenantId || (!customerId && !email)) {
      return jsonResponse({ error: "tenantId and customerId or email are required", code: "missing_required_field" }, 400);
    }
    if (action !== "grant" && action !== "revoke") {
      return jsonResponse({ error: "invalid action", code: "invalid_action" }, 400);
    }

    // AuthZ — precisa ser membro do workspace
    await authorizeWorkspace(identity, tenantId, admin, { minRole: "editor" });
    await assertTenantActive(admin, tenantId);
    await assertActiveSubscription(admin, tenantId);

    // Toggle do tenant
    const { data: settings } = await admin
      .from("tenant_settings")
      .select("allow_manual_enrollment")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!settings?.allow_manual_enrollment) {
      return jsonResponse(
        { error: "Manual enrollment is disabled for this workspace", code: "manual_enrollment_disabled" },
        403,
      );
    }

    // Customer precisa pertencer ao tenant (por id ou email)
    let customerQuery = admin
      .from("customers")
      .select("id, tenant_id, user_id, email")
      .eq("tenant_id", tenantId);
    customerQuery = customerId
      ? customerQuery.eq("id", customerId)
      : customerQuery.eq("email", email);
    const { data: customer } = await customerQuery.maybeSingle();

    if (!customer) {
      return jsonResponse({ error: "Customer not found in this workspace", code: "customer_not_found" }, 404);
    }
    const resolvedCustomerId = customer.id;

    // Valida produtos/cursos do tenant
    const validProductIds = new Set<string>();
    if (productIds.length > 0) {
      const { data: prods } = await admin
        .from("products").select("id").eq("tenant_id", tenantId).in("id", productIds);
      (prods ?? []).forEach((p: { id: string }) => validProductIds.add(p.id));
    }
    const validCourseIds = new Set<string>();
    if (courseIds.length > 0) {
      const { data: crs } = await admin
        .from("courses").select("id").eq("tenant_id", tenantId).in("id", courseIds);
      (crs ?? []).forEach((c: { id: string }) => validCourseIds.add(c.id));
    }

    const result = { products: [] as string[], courses: [] as string[], skipped: [] as string[] };

    // ── PRODUTOS ──
    for (const productId of validProductIds) {
      const { data: existing } = await admin
        .from("orders")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("customer_id", resolvedCustomerId)
        .eq("product_id", productId)
        .eq("source", "manual")
        .maybeSingle();

      if (action === "grant") {
        if (existing) {
          if (existing.status !== "completed") {
            await admin.from("orders").update({ status: "completed" }).eq("id", existing.id);
          }
        } else {
          const { error } = await admin.from("orders").insert({
            tenant_id: tenantId,
            customer_id: resolvedCustomerId,
            product_id: productId,
            status: "completed",
            source: "manual",
            payment_method: "free",
            unit_amount: 0,
            currency: "BRL",
            customer_email_snapshot: customer.email,
          });
          if (error) throw error;
        }
        result.products.push(productId);
      } else {
        // revoke → cancela o pedido manual (trigger remove o acesso se não houver outro pedido ativo)
        if (existing && existing.status !== "cancelled") {
          await admin.from("orders").update({ status: "cancelled" }).eq("id", existing.id);
        }
        result.products.push(productId);
      }
    }

    // ── CURSOS (acesso direto) ──
    if (validCourseIds.size > 0) {
      if (!customer.user_id) {
        // Sem conta ainda (convite não aceito) → não dá pra criar course_customers
        validCourseIds.forEach((id) => result.skipped.push(id));
      } else {
        for (const courseId of validCourseIds) {
          if (action === "grant") {
            const { error } = await admin
              .from("course_customers")
              .upsert({ course_id: courseId, user_id: customer.user_id }, { onConflict: "course_id,user_id", ignoreDuplicates: true });
            if (error) throw error;
          } else {
            await admin
              .from("course_customers")
              .delete()
              .eq("course_id", courseId)
              .eq("user_id", customer.user_id);
          }
          result.courses.push(courseId);
        }
      }
    }

    return jsonResponse({ success: true, action, ...result });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message, code: error.code }, error.status);
    }
    console.error("enroll-customer error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});
