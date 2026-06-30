import { useQuery } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/lib/edge-function-utils";

export type AccountStatus = "active" | "paused" | "blocked" | "cancelled";

export interface TenantDetailMember {
  user_id: string;
  role: "owner" | "editor" | "member";
  status: string;
  created_at: string;
  name: string | null;
  email: string | null;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
}

export interface TenantDetailOrder {
  id: string;
  status: string;
  unit_amount: number;
  created_at: string;
  customers: { name: string | null; email: string } | null;
}

export interface TenantDetailCustomer {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
}

export interface TenantDetailIntegration {
  provider: string;
  status: string;
  updated_at: string | null;
}

export interface TenantSubscription {
  plan_key: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  updated_at: string;
}

export interface SuperadminTenantDetail {
  tenant: {
    id: string;
    name: string;
    slug: string;
    public_id: string | null;
    created_at: string;
  };
  plan: string;
  account_status: AccountStatus;
  account_status_reason: string | null;
  account_status_updated_at: string | null;
  subscription: TenantSubscription | null;
  owner: { name: string | null; email: string | null } | null;
  metrics: {
    customers: number;
    products: number;
    courses: number;
    orders: number;
    revenue: number;
  };
  members: TenantDetailMember[];
  recent_orders: TenantDetailOrder[];
  recent_customers: TenantDetailCustomer[];
  integrations: TenantDetailIntegration[];
}

export interface SuperadminAuditLog {
  id: string;
  actor_user_id: string;
  tenant_id: string | null;
  target_type: string;
  target_id: string | null;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const FN = "superadmin-tenant-admin";

export function useSuperadminTenantDetail(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["superadmin_tenant_detail", tenantId],
    enabled: !!tenantId,
    staleTime: 10_000,
    queryFn: async () => {
      const { data } = await invokeEdgeFunction<SuperadminTenantDetail>(FN, {
        body: { action: "get_tenant_detail", tenant_id: tenantId },
      });
      return data;
    },
  });
}

export function useSuperadminAuditLogs(tenantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["superadmin_audit_logs", tenantId],
    enabled: !!tenantId && enabled,
    staleTime: 10_000,
    queryFn: async () => {
      const { data } = await invokeEdgeFunction<{ logs: SuperadminAuditLog[] }>(FN, {
        body: { action: "list_audit_logs", tenant_id: tenantId },
      });
      return data.logs;
    },
  });
}

/** Dispara uma acao de mutacao na edge function superadmin-tenant-admin. */
export async function tenantAdminAction<T = Record<string, unknown>>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data } = await invokeEdgeFunction<T>(FN, { body });
  return data;
}

// ── Fase 6/7: acesso de cliente, cursos e eventos de gateway ────────

export interface TenantCourseOption {
  id: string;
  title: string | null;
  slug: string | null;
  is_active: boolean;
}

export interface CustomerCourseAccess {
  course_id: string;
  title: string | null;
  slug: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface GatewayEvent {
  id: string;
  provider: string | null;
  event_type: string | null;
  external_event_type: string | null;
  external_order_id: string | null;
  buyer_email: string | null;
  status: string | null;
  error_message: string | null;
  retry_count: number | null;
  created_at: string;
}

export async function listTenantCourses(tenantId: string): Promise<TenantCourseOption[]> {
  const data = await tenantAdminAction<{ courses: TenantCourseOption[] }>({ action: "list_tenant_courses", tenant_id: tenantId });
  return data.courses;
}

export async function listCustomerAccess(
  tenantId: string,
  customerId: string,
): Promise<{ access: CustomerCourseAccess[]; user_linked: boolean }> {
  return tenantAdminAction<{ access: CustomerCourseAccess[]; user_linked: boolean }>({
    action: "list_customer_access",
    tenant_id: tenantId,
    customer_id: customerId,
  });
}

export function useTenantGatewayEvents(tenantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["superadmin_gateway_events", tenantId],
    enabled: !!tenantId && enabled,
    staleTime: 10_000,
    queryFn: async () => {
      const { data } = await invokeEdgeFunction<{ events: GatewayEvent[] }>(FN, {
        body: { action: "list_gateway_events", tenant_id: tenantId },
      });
      return data.events;
    },
  });
}
