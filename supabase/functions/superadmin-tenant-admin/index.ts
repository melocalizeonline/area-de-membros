// Edge function: superadmin-tenant-admin (somente platform admin / role 'admin')
//
// Backend das acoes do detalhe de tenant no Superadmin. Toda mutacao grava
// um registro em superadmin_audit_logs. Usa service role internamente; a
// autorizacao e feita por is_admin via user_roles.
//
// Acoes:
//   get_tenant_detail   { tenant_id }                              -> detalhe completo do tenant
//   update_tenant       { tenant_id, name?, slug? }                -> atualiza dados basicos
//   update_plan         { tenant_id, plan }                        -> troca plano (free/pro/business…)
//   update_status       { tenant_id, account_status, reason? }     -> active/paused/blocked/cancelled
//   update_member_role  { tenant_id, user_id, role }               -> owner/editor
//   update_member_status{ tenant_id, user_id, status }             -> active/paused
//   resend_member_invite{ tenant_id, user_id, origin? }            -> reenvia convite (membro pending)
//   list_audit_logs     { tenant_id?, limit?, offset? }            -> trilha de auditoria

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { authenticateRequest, AuthError, toErrorResponse } from "../_shared/auth.ts";
import { resolvePublicSiteUrl } from "../_shared/site-url.ts";
import { sendAndLogEmail } from "../_shared/send-email.ts";
import { resolveEmailLanguage, getEmailTranslations, type EmailLanguage } from "../_shared/email-i18n.ts";
import { buildTeamInviteEmail, buildCustomerInviteEmail, buildCustomerAccessEmail } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const ACCOUNT_STATUSES = ["active", "paused", "blocked", "cancelled"] as const;
const MEMBER_STATUSES = ["active", "paused"] as const;
const MEMBER_ROLES = ["owner", "editor"] as const;

type AuditEntry = {
  actorUserId: string;
  tenantId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
};

async function writeAudit(admin: SupabaseClient, e: AuditEntry) {
  const { error } = await admin.from("superadmin_audit_logs").insert({
    actor_user_id: e.actorUserId,
    tenant_id: e.tenantId,
    target_type: e.targetType,
    target_id: e.targetId,
    action: e.action,
    before_data: e.before ?? null,
    after_data: e.after ?? null,
    metadata: e.metadata ?? {},
  });
  if (error) console.error("superadmin-tenant-admin: audit insert failed:", error);
}

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

    const actor = identity.userId;
    const body = await req.json().catch(() => ({}));
    const action: string = (body.action ?? "").trim();
    const tenantId: string = (body.tenant_id ?? "").trim();

    const requireTenant = () => {
      if (!tenantId) throw new AuthError(400, "missing_required_field", "tenant_id is required");
    };
    const loadTenant = async () => {
      const { data } = await admin.from("tenants").select("id, name, slug").eq("id", tenantId).maybeSingle();
      if (!data) throw new AuthError(404, "tenant_not_found", "Tenant nao encontrado");
      return data;
    };

    switch (action) {
      // ── Leitura ────────────────────────────────────────────────
      case "get_tenant_detail": {
        requireTenant();
        const { data: tenant } = await admin
          .from("tenants").select("id, name, slug, public_id, created_at, created_by").eq("id", tenantId).maybeSingle();
        if (!tenant) throw new AuthError(404, "tenant_not_found", "Tenant nao encontrado");

        const { data: settings } = await admin
          .from("tenant_settings")
          .select("plan, account_status, account_status_reason, account_status_updated_at")
          .eq("tenant_id", tenantId).maybeSingle();

        // Metricas
        const [customers, products, courses, ordersAgg] = await Promise.all([
          admin.from("customers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          admin.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          admin.from("courses").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
          admin.from("orders").select("unit_amount, status").eq("tenant_id", tenantId).in("status", ["approved", "completed"]),
        ]);
        const revenue = (ordersAgg.data ?? []).reduce((s, o) => s + Number((o as { unit_amount?: number }).unit_amount ?? 0), 0);

        // Membros (com dados de auth)
        const { data: memberRows } = await admin
          .from("tenant_users").select("user_id, role, status, created_at").eq("tenant_id", tenantId).order("created_at");
        const userIds = (memberRows ?? []).map((m) => m.user_id);
        const profileMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profiles } = await admin.from("profiles").select("user_id, name").in("user_id", userIds);
          for (const p of profiles ?? []) profileMap.set(p.user_id, (p as { name?: string }).name ?? "");
        }
        const members = await Promise.all((memberRows ?? []).map(async (m) => {
          const { data: au } = await admin.auth.admin.getUserById(m.user_id);
          return {
            user_id: m.user_id,
            role: m.role,
            status: m.status,
            created_at: m.created_at,
            name: profileMap.get(m.user_id) || null,
            email: au?.user?.email ?? null,
            email_confirmed: !!au?.user?.email_confirmed_at,
            last_sign_in_at: au?.user?.last_sign_in_at ?? null,
          };
        }));

        const ownerMember = members.find((m) => m.role === "owner");

        const { data: recentOrders } = await admin
          .from("orders")
          .select("id, status, unit_amount, created_at, customers(name, email)")
          .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10);

        const { data: recentCustomers } = await admin
          .from("customers")
          .select("id, name, email, created_at")
          .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10);

        const { data: integrations } = await admin
          .from("tenant_integrations")
          .select("provider, status, updated_at")
          .eq("tenant_id", tenantId).order("provider");

        const { data: subscription } = await admin
          .from("platform_subscriptions")
          .select("plan_key, status, trial_ends_at, current_period_end, updated_at")
          .eq("tenant_id", tenantId).maybeSingle();

        return json({
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            public_id: tenant.public_id,
            created_at: tenant.created_at,
          },
          plan: settings?.plan ?? "free",
          account_status: settings?.account_status ?? "active",
          account_status_reason: settings?.account_status_reason ?? null,
          account_status_updated_at: settings?.account_status_updated_at ?? null,
          owner: ownerMember ? { name: ownerMember.name, email: ownerMember.email } : null,
          metrics: {
            customers: customers.count ?? 0,
            products: products.count ?? 0,
            courses: courses.count ?? 0,
            orders: (ordersAgg.data ?? []).length,
            revenue,
          },
          members,
          recent_orders: recentOrders ?? [],
          recent_customers: recentCustomers ?? [],
          integrations: integrations ?? [],
          subscription: subscription ?? null,
        });
      }

      case "list_audit_logs": {
        const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
        const offset = Math.max(Number(body.offset) || 0, 0);
        let query = admin
          .from("superadmin_audit_logs")
          .select("id, actor_user_id, tenant_id, target_type, target_id, action, before_data, after_data, metadata, created_at")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (tenantId) query = query.eq("tenant_id", tenantId);
        const { data, error } = await query;
        if (error) throw error;
        return json({ logs: data ?? [] });
      }

      // ── Mutacoes do tenant ─────────────────────────────────────
      case "update_tenant": {
        requireTenant();
        const before = await loadTenant();
        const patch: Record<string, unknown> = {};
        if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
        if (typeof body.slug === "string" && body.slug.trim()) {
          const slug = body.slug.trim().toLowerCase();
          if (!/^[a-z0-9-]+$/.test(slug)) return json({ error: "Slug invalido", code: "invalid_slug" }, 400);
          patch.slug = slug;
        }
        if (Object.keys(patch).length === 0) return json({ error: "Nada para atualizar", code: "nothing_to_update" }, 400);

        const { error } = await admin.from("tenants").update(patch).eq("id", tenantId);
        if (error) {
          if (String(error.code) === "23505") return json({ error: "Slug ja em uso", code: "slug_taken" }, 409);
          throw error;
        }
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "tenant", targetId: tenantId,
          action: "update_tenant", before, after: { ...before, ...patch },
        });
        return json({ success: true, tenant_id: tenantId, ...patch });
      }

      case "update_plan": {
        requireTenant();
        const plan = (body.plan ?? "").trim();
        if (!plan) return json({ error: "plan is required", code: "missing_required_field" }, 400);
        const { data: planRow } = await admin.from("platform_plans").select("key").eq("key", plan).maybeSingle();
        if (!planRow) return json({ error: "Plano desconhecido", code: "unknown_plan" }, 400);
        await loadTenant();

        const { data: before } = await admin.from("tenant_settings").select("plan").eq("tenant_id", tenantId).maybeSingle();
        const { error } = await admin.from("tenant_settings").update({ plan }).eq("tenant_id", tenantId);
        if (error) throw error;
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "tenant", targetId: tenantId,
          action: "update_plan", before: { plan: before?.plan ?? null }, after: { plan },
        });
        return json({ success: true, tenant_id: tenantId, plan });
      }

      case "update_status": {
        requireTenant();
        const status = (body.account_status ?? "").trim();
        const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;
        if (!ACCOUNT_STATUSES.includes(status as typeof ACCOUNT_STATUSES[number]))
          return json({ error: "Status invalido", code: "invalid_status" }, 400);
        await loadTenant();

        const { data: before } = await admin
          .from("tenant_settings").select("account_status, account_status_reason").eq("tenant_id", tenantId).maybeSingle();
        const { error } = await admin.from("tenant_settings").update({
          account_status: status,
          account_status_reason: reason,
          account_status_updated_at: new Date().toISOString(),
        }).eq("tenant_id", tenantId);
        if (error) throw error;
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "tenant", targetId: tenantId,
          action: "update_status",
          before: { account_status: before?.account_status ?? null, account_status_reason: before?.account_status_reason ?? null },
          after: { account_status: status, account_status_reason: reason },
        });
        return json({ success: true, tenant_id: tenantId, account_status: status });
      }

      // ── Mutacoes de membro ─────────────────────────────────────
      case "update_member_role": {
        requireTenant();
        const memberId = (body.user_id ?? "").trim();
        const role = (body.role ?? "").trim();
        if (!memberId) return json({ error: "user_id is required", code: "missing_required_field" }, 400);
        if (!MEMBER_ROLES.includes(role as typeof MEMBER_ROLES[number]))
          return json({ error: "Role invalida", code: "invalid_role" }, 400);

        const { data: target } = await admin
          .from("tenant_users").select("user_id, role, status").eq("tenant_id", tenantId).eq("user_id", memberId).maybeSingle();
        if (!target) return json({ error: "Membro nao encontrado", code: "member_not_found" }, 404);

        // Nao deixar o tenant sem nenhum owner ativo
        if (target.role === "owner" && role !== "owner") {
          const { count } = await admin
            .from("tenant_users").select("user_id", { count: "exact", head: true })
            .eq("tenant_id", tenantId).eq("role", "owner").eq("status", "active");
          if ((count ?? 0) <= 1) return json({ error: "O tenant precisa de ao menos um owner", code: "last_owner" }, 409);
        }

        const { error } = await admin.from("tenant_users").update({ role }).eq("tenant_id", tenantId).eq("user_id", memberId);
        if (error) throw error;
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "tenant_user", targetId: memberId,
          action: "update_member_role", before: { role: target.role }, after: { role },
        });
        return json({ success: true, tenant_id: tenantId, user_id: memberId, role });
      }

      case "update_member_status": {
        requireTenant();
        const memberId = (body.user_id ?? "").trim();
        const status = (body.status ?? "").trim();
        if (!memberId) return json({ error: "user_id is required", code: "missing_required_field" }, 400);
        if (!MEMBER_STATUSES.includes(status as typeof MEMBER_STATUSES[number]))
          return json({ error: "Status invalido", code: "invalid_status" }, 400);

        const { data: target } = await admin
          .from("tenant_users").select("user_id, role, status").eq("tenant_id", tenantId).eq("user_id", memberId).maybeSingle();
        if (!target) return json({ error: "Membro nao encontrado", code: "member_not_found" }, 404);

        // Nao pausar o ultimo owner ativo
        if (target.role === "owner" && status !== "active") {
          const { count } = await admin
            .from("tenant_users").select("user_id", { count: "exact", head: true })
            .eq("tenant_id", tenantId).eq("role", "owner").eq("status", "active");
          if ((count ?? 0) <= 1) return json({ error: "O tenant precisa de ao menos um owner ativo", code: "last_owner" }, 409);
        }

        const { error } = await admin.from("tenant_users").update({ status }).eq("tenant_id", tenantId).eq("user_id", memberId);
        if (error) throw error;
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "tenant_user", targetId: memberId,
          action: "update_member_status", before: { status: target.status }, after: { status },
        });
        return json({ success: true, tenant_id: tenantId, user_id: memberId, status });
      }

      case "resend_member_invite": {
        requireTenant();
        const memberId = (body.user_id ?? "").trim();
        if (!memberId) return json({ error: "user_id is required", code: "missing_required_field" }, 400);
        const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
        if (!resendApiKey) return json({ error: "Email nao configurado", code: "missing_resend_mkt_api_key" }, 500);

        const { data: member } = await admin
          .from("tenant_users").select("user_id, role, status").eq("tenant_id", tenantId).eq("user_id", memberId).maybeSingle();
        if (!member) return json({ error: "Membro nao encontrado", code: "member_not_found" }, 404);
        if (member.status !== "pending")
          return json({ error: "Este membro ja aceitou o convite", code: "invite_already_accepted" }, 400);

        const { data: au } = await admin.auth.admin.getUserById(memberId);
        if (!au?.user?.email) return json({ error: "Usuario nao encontrado", code: "user_not_found" }, 404);
        const memberEmail = au.user.email;
        const memberName = (au.user.user_metadata?.name as string) || "";

        let lang: EmailLanguage = resolveEmailLanguage(au.user.user_metadata);
        if (!au.user.user_metadata?.language) {
          const { data: profile } = await admin.from("profiles").select("preferences").eq("user_id", memberId).maybeSingle();
          lang = resolveEmailLanguage(au.user.user_metadata, profile?.preferences as Record<string, unknown> | null);
        }

        const { data: tenantRaw } = await admin
          .from("tenants").select("name, slug, tenant_settings(email_sender_name)").eq("id", tenantId).maybeSingle();
        const ts = (tenantRaw?.tenant_settings ?? {}) as { email_sender_name?: string };
        const tenantName = tenantRaw?.name || "Workspace";
        const senderName = ts.email_sender_name || tenantName;

        const siteUrl = resolvePublicSiteUrl(typeof body.origin === "string" ? body.origin : undefined);
        const redirectTo = `${siteUrl}/admin/accept-invite`;
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink", email: memberEmail, options: { redirectTo },
        });
        if (linkErr || !linkData?.properties?.action_link) {
          console.error("superadmin-tenant-admin: magic link error:", linkErr);
          return json({ error: "Falha ao gerar link de convite", code: "internal_error" }, 500);
        }

        const t = getEmailTranslations(lang);
        const html = buildTeamInviteEmail(lang, memberName, tenantName, linkData.properties.action_link, member.role as "owner" | "editor");
        const emailResult = await sendAndLogEmail({
          resendApiKey, supabaseAdmin: admin, senderName, to: memberEmail,
          subject: t.teamInvite.subject(tenantName), html,
          tenantId, emailType: "team_invite", userId: memberId,
        });
        if (!emailResult.ok) {
          console.error("superadmin-tenant-admin: email error:", emailResult.error);
          return json({ error: "Falha ao enviar email", code: "email_send_failed" }, 500);
        }
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "tenant_user", targetId: memberId,
          action: "resend_member_invite", metadata: { email: memberEmail },
        });
        return json({ success: true });
      }

      // ── Operacoes de cliente/acesso (Fase 6) ───────────────────
      case "list_tenant_courses": {
        requireTenant();
        const { data } = await admin
          .from("courses").select("id, title, slug, is_active")
          .eq("tenant_id", tenantId).order("title");
        return json({ courses: data ?? [] });
      }

      case "list_customer_access": {
        requireTenant();
        const customerId = (body.customer_id ?? "").trim();
        if (!customerId) return json({ error: "customer_id is required", code: "missing_required_field" }, 400);
        const { data: customer } = await admin
          .from("customers").select("id, user_id, email").eq("id", customerId).eq("tenant_id", tenantId).maybeSingle();
        if (!customer) return json({ error: "Cliente nao encontrado", code: "customer_not_found" }, 404);
        if (!customer.user_id) return json({ access: [], user_linked: false });

        const { data: rows } = await admin
          .from("course_customers")
          .select("course_id, expires_at, created_at, courses(title, slug, tenant_id)")
          .eq("user_id", customer.user_id);
        const access = (rows ?? [])
          .filter((r) => (r.courses as { tenant_id?: string } | null)?.tenant_id === tenantId)
          .map((r) => ({
            course_id: r.course_id,
            title: (r.courses as { title?: string } | null)?.title ?? null,
            slug: (r.courses as { slug?: string } | null)?.slug ?? null,
            expires_at: r.expires_at,
            created_at: r.created_at,
          }));
        return json({ access, user_linked: true });
      }

      case "grant_course_access":
      case "revoke_course_access": {
        requireTenant();
        const customerId = (body.customer_id ?? "").trim();
        const courseId = (body.course_id ?? "").trim();
        if (!customerId || !courseId)
          return json({ error: "customer_id and course_id are required", code: "missing_required_field" }, 400);

        const { data: course } = await admin
          .from("courses").select("id").eq("id", courseId).eq("tenant_id", tenantId).maybeSingle();
        if (!course) return json({ error: "Curso nao encontrado", code: "course_not_found" }, 404);
        const { data: customer } = await admin
          .from("customers").select("id, user_id").eq("id", customerId).eq("tenant_id", tenantId).maybeSingle();
        if (!customer) return json({ error: "Cliente nao encontrado", code: "customer_not_found" }, 404);
        if (!customer.user_id)
          return json({ error: "Cliente sem conta (convite nao aceito)", code: "customer_no_account" }, 409);

        if (action === "grant_course_access") {
          const { error } = await admin.from("course_customers")
            .upsert({ course_id: courseId, user_id: customer.user_id }, { onConflict: "course_id,user_id", ignoreDuplicates: true });
          if (error) throw error;
        } else {
          const { error } = await admin.from("course_customers")
            .delete().eq("course_id", courseId).eq("user_id", customer.user_id);
          if (error) throw error;
        }
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "customer", targetId: customerId,
          action, after: { course_id: courseId },
        });
        return json({ success: true });
      }

      case "resend_customer_access": {
        requireTenant();
        const customerId = (body.customer_id ?? "").trim();
        if (!customerId) return json({ error: "customer_id is required", code: "missing_required_field" }, 400);
        const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
        if (!resendApiKey) return json({ error: "Email nao configurado", code: "missing_resend_mkt_api_key" }, 500);

        const { data: customer } = await admin
          .from("customers").select("id, user_id, email, name, tenant_id")
          .eq("id", customerId).eq("tenant_id", tenantId).maybeSingle();
        if (!customer) return json({ error: "Cliente nao encontrado", code: "customer_not_found" }, 404);
        if (!customer.user_id) return json({ error: "Cliente sem conta vinculada", code: "customer_no_account" }, 409);

        const { data: tenantRaw } = await admin
          .from("tenants").select("name, slug, tenant_settings(icon_url, email_sender_name)").eq("id", tenantId).maybeSingle();
        const ts = (tenantRaw?.tenant_settings ?? {}) as { icon_url?: string; email_sender_name?: string };
        const tenantName = tenantRaw?.name || "Portal";
        const tenantSlug = tenantRaw?.slug || "";
        const tenantLogoUrl = ts.icon_url || null;
        const senderName = ts.email_sender_name || tenantName;

        const { data: au } = await admin.auth.admin.getUserById(customer.user_id);
        if (!au?.user) return json({ error: "Usuario nao encontrado", code: "user_not_found" }, 404);

        let lang: EmailLanguage = resolveEmailLanguage(au.user.user_metadata);
        if (!au.user.user_metadata?.language) {
          const { data: profile } = await admin.from("profiles").select("preferences").eq("user_id", customer.user_id).maybeSingle();
          lang = resolveEmailLanguage(au.user.user_metadata, profile?.preferences as Record<string, unknown> | null);
        }
        const t = getEmailTranslations(lang);
        const siteUrl = resolvePublicSiteUrl(typeof body.origin === "string" ? body.origin : undefined);

        let html: string; let subject: string; let emailType: "customer_invite" | "access_granted";
        if (!au.user.email_confirmed_at) {
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "invite", email: customer.email,
            options: { data: { name: customer.name, signup_as: "customer", customer_tenant_id: tenantId }, redirectTo: `${siteUrl}/${tenantSlug}/portal` },
          });
          if (linkErr || !linkData?.properties?.action_link)
            return json({ error: "Falha ao gerar link de convite", code: "internal_error" }, 500);
          html = buildCustomerInviteEmail(lang, customer.name, tenantName, tenantLogoUrl, linkData.properties.action_link);
          subject = t.customerInvite.subject(tenantName);
          emailType = "customer_invite";
        } else {
          html = buildCustomerAccessEmail(lang, customer.name, tenantName, tenantLogoUrl, `${siteUrl}/${tenantSlug}/login`);
          subject = t.customerAccess.subject(tenantName);
          emailType = "access_granted";
        }
        const emailResult = await sendAndLogEmail({
          resendApiKey, supabaseAdmin: admin, senderName, to: customer.email, subject, html,
          tenantId, emailType, customerId: customer.id, userId: customer.user_id,
        });
        if (!emailResult.ok) return json({ error: "Falha ao enviar email", code: "email_send_failed" }, 500);
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "customer", targetId: customerId,
          action: "resend_customer_access", metadata: { email: customer.email, type: emailType },
        });
        return json({ success: true });
      }

      // ── Operacoes de pedido/integracao (Fase 7) ────────────────
      case "reprocess_order": {
        requireTenant();
        const orderId = (body.order_id ?? "").trim();
        const resendEmail = !!body.resend_email;
        if (!orderId) return json({ error: "order_id is required", code: "missing_required_field" }, 400);
        const { data: order } = await admin
          .from("orders").select("id, status").eq("id", orderId).eq("tenant_id", tenantId).maybeSingle();
        if (!order) return json({ error: "Pedido nao encontrado", code: "order_not_found" }, 404);

        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/reconcile-access`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ order_id: orderId, trigger_source: "admin_button", force_resend_email: resendEmail }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok)
          return json({ error: (result as { error?: string }).error ?? "Falha ao reprocessar", code: "reprocess_failed" }, 502);
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "order", targetId: orderId,
          action: "reprocess_order", metadata: { resend_email: resendEmail },
        });
        return json({ success: true, result });
      }

      case "update_order_status": {
        requireTenant();
        const orderId = (body.order_id ?? "").trim();
        const status = (body.status ?? "").trim();
        const ALLOWED = ["approved", "completed", "cancelled", "refunded", "disputed", "chargeback", "pending"];
        if (!orderId) return json({ error: "order_id is required", code: "missing_required_field" }, 400);
        if (!ALLOWED.includes(status)) return json({ error: "Status invalido", code: "invalid_status" }, 400);
        const { data: order } = await admin
          .from("orders").select("id, status").eq("id", orderId).eq("tenant_id", tenantId).maybeSingle();
        if (!order) return json({ error: "Pedido nao encontrado", code: "order_not_found" }, 404);

        const { error } = await admin.from("orders").update({ status }).eq("id", orderId);
        if (error) throw error;
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "order", targetId: orderId,
          action: "update_order_status", before: { status: order.status }, after: { status },
        });
        return json({ success: true, order_id: orderId, status });
      }

      case "disconnect_integration": {
        requireTenant();
        const provider = (body.provider ?? "").trim();
        if (!provider) return json({ error: "provider is required", code: "missing_required_field" }, 400);
        const { data: integ } = await admin
          .from("tenant_integrations").select("id, status").eq("tenant_id", tenantId).eq("provider", provider).maybeSingle();
        if (!integ) return json({ error: "Integracao nao encontrada", code: "integration_not_found" }, 404);

        await admin.from("tenant_integration_secrets").delete().eq("integration_id", integ.id);
        const { error } = await admin.from("tenant_integrations")
          .update({ status: "inactive", credentials_hint: null, last_error: "Desconectado pelo superadmin", updated_at: new Date().toISOString() })
          .eq("id", integ.id);
        if (error) throw error;
        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "integration", targetId: integ.id,
          action: "disconnect_integration", before: { status: integ.status }, after: { status: "inactive" }, metadata: { provider },
        });
        return json({ success: true });
      }

      case "list_gateway_events": {
        requireTenant();
        const limit = Math.min(Math.max(Number(body.limit) || 30, 1), 100);
        const { data, error } = await admin
          .from("gateway_events")
          .select("id, provider, event_type, external_event_type, external_order_id, buyer_email, status, error_message, retry_count, created_at")
          .eq("tenant_id", tenantId).order("created_at", { ascending: false }).range(0, limit - 1);
        if (error) throw error;
        return json({ events: data ?? [] });
      }

      // ── Assinatura da plataforma (billing manual) ──────────────
      case "set_subscription": {
        requireTenant();
        const planKey = (body.plan_key ?? "").trim();
        const status = (body.status ?? "").trim();
        const periodMonths = Math.min(Math.max(Number(body.period_months) || 1, 1), 36);
        const ALLOWED = ["active", "canceled", "past_due", "free"];
        if (!ALLOWED.includes(status)) return json({ error: "Status invalido", code: "invalid_status" }, 400);
        if (!planKey) return json({ error: "plan_key is required", code: "missing_required_field" }, 400);
        await loadTenant();

        const { data: plan } = await admin.from("platform_plans").select("key").eq("key", planKey).maybeSingle();
        if (!plan) return json({ error: "Plano desconhecido", code: "unknown_plan" }, 400);

        const currentPeriodEnd =
          status === "active"
            ? new Date(Date.now() + periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

        const { data: before } = await admin
          .from("platform_subscriptions").select("plan_key, status, current_period_end").eq("tenant_id", tenantId).maybeSingle();

        const { error } = await admin.from("platform_subscriptions").upsert(
          {
            tenant_id: tenantId,
            plan_key: planKey,
            status,
            current_period_end: currentPeriodEnd,
            trial_ends_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" },
        );
        if (error) throw error;

        // Ativo/free liberam o plano nos entitlements.
        if (status === "active" || status === "free") {
          await admin.from("tenant_settings").update({ plan: planKey }).eq("tenant_id", tenantId);
        }

        await writeAudit(admin, {
          actorUserId: actor, tenantId, targetType: "subscription", targetId: tenantId,
          action: "set_subscription",
          before: before ?? null,
          after: { plan_key: planKey, status, current_period_end: currentPeriodEnd },
        });
        return json({ success: true, plan_key: planKey, status, current_period_end: currentPeriodEnd });
      }

      default:
        return json({ error: "invalid action", code: "invalid_action" }, 400);
    }
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message, code: error.code }, error.status);
    console.error("superadmin-tenant-admin error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});
