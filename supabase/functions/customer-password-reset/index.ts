// Edge function: customer-password-reset
//
// Suporte: o admin dispara um e-mail de redefinição de senha para um cliente.
// Gera um link de recovery e envia via Resend com a marca do tenant.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, authorizeWorkspace, toErrorResponse } from "../_shared/auth.ts";
import { resolvePublicSiteUrl } from "../_shared/site-url.ts";
import { sendAndLogEmail } from "../_shared/send-email.ts";
import { type EmailLanguage, resolveEmailLanguage, getEmailTranslations } from "../_shared/email-i18n.ts";
import { buildRecoveryEmail } from "../_shared/email-templates.ts";

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const admin = createClient(supabaseUrl, serviceKey);

    const identity = await authenticateRequest(req, admin);

    const { customer_id, origin } = await req.json();
    if (!customer_id || typeof customer_id !== "string") {
      return jsonResponse({ error: "customer_id is required", code: "missing_required_field" }, 400);
    }

    const siteUrl = resolvePublicSiteUrl(origin);

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id, user_id, email, name, tenant_id")
      .eq("id", customer_id)
      .single();
    if (customerError || !customer) {
      return jsonResponse({ error: "Customer not found", code: "customer_not_found" }, 404);
    }

    await authorizeWorkspace(identity, customer.tenant_id, admin, { minRole: "owner" });

    const { data: tenantRaw } = await admin
      .from("tenants")
      .select("name, slug, tenant_settings(icon_url, email_sender_name)")
      .eq("id", customer.tenant_id)
      .single();

    const ts = tenantRaw?.tenant_settings ?? {};
    const tenantName = tenantRaw?.name || "Portal";
    const tenantSlug = tenantRaw?.slug || "";
    const senderName = ts.email_sender_name || tenantName;

    if (!resendApiKey) {
      return jsonResponse({ error: "Email not configured", code: "email_not_configured" }, 500);
    }

    // Idioma
    let lang: EmailLanguage = "pt-BR";
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(customer.user_id);
      lang = resolveEmailLanguage(authUser?.user?.user_metadata);
    } catch { /* default */ }
    const t = getEmailTranslations(lang);

    // Gera link de recovery
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: customer.email,
      options: { redirectTo: `${siteUrl}/${tenantSlug}/reset-password` },
    });
    if (linkError || !linkData?.properties?.action_link) {
      return jsonResponse({ error: "Failed to generate reset link", code: "internal_error" }, 500);
    }

    const html = buildRecoveryEmail(lang, customer.name || "", linkData.properties.action_link);

    const result = await sendAndLogEmail({
      resendApiKey,
      supabaseAdmin: admin,
      senderName,
      to: customer.email,
      subject: t.recovery.subject,
      html,
      tenantId: customer.tenant_id,
      emailType: "password_reset",
      customerId: customer.id,
      userId: customer.user_id,
    });

    if (!result.ok) {
      return jsonResponse({ error: "Failed to send email", code: "email_send_failed" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});
