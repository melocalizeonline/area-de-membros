# Superadmin Administrative Roadmap

## Context

The current Superadmin area is useful for visibility, but it is still limited as an operational backoffice. It lists tenants, users, orders, customers, products, sellers, and hosting data. Most tenant/user/customer actions are read-only. Hosting is the most complete area today, with platform API configuration, domain assignment, request approval, and capability toggles.

This document defines the implementation plan to turn Superadmin into a complete administrative console for tenant lifecycle, plans, access control, and operational support.

## Goals

- Allow platform admins to manage tenant plans and access status.
- Allow platform admins to inspect and edit a tenant from a detail page.
- Allow platform admins to pause, reactivate, block, or cancel tenant access.
- Allow platform admins to manage tenant members and resend access.
- Add configurable plan definitions and feature flags instead of hardcoded plan checks.
- Add audit logs for every sensitive Superadmin action.

## Non-Goals For Phase 1

- Billing automation with an external subscription provider.
- Full impersonation as tenant/customer.
- Full CRM/support workflow.
- Deleting tenant data permanently.

These can be added later, but the first implementation should focus on operational controls that are safe, auditable, and immediately useful.

## Current State

Existing Superadmin pages:

- `/superadmin/dashboard`
- `/superadmin/tenants`
- `/superadmin/users`
- `/superadmin/orders`
- `/superadmin/customers`
- `/superadmin/products`
- `/superadmin/sellers`
- `/superadmin/hosting`

Existing strengths:

- Global dashboards and lists exist.
- Tenant, user, customer, order, product, seller, and hosting data can be queried.
- Hosting already has meaningful admin actions.
- `tenant_settings.plan` already exists.
- `tenant_users.status` already exists.
- `is_admin()` already exists and is used by Superadmin RPCs.

Main gaps:

- No tenant detail route.
- No tenant plan editor.
- No platform plan configuration page.
- No tenant pause/block/cancel workflow.
- No tenant member action controls from Superadmin.
- No Superadmin audit log.
- Most operational support actions require tenant owner/editor context.

## Phase 1: Tenant Detail And Core Admin Actions

### Scope

Add a tenant detail page at:

```text
/superadmin/tenants/:tenantId
```

From `/superadmin/tenants`, clicking a tenant row should open this detail page.

### Tenant Detail Sections

The page should include:

- Header with tenant name, slug, plan, and status.
- Basic details:
  - name
  - slug
  - public id
  - created at
  - owner
- Plan and account status:
  - plan: `free`, `pro`, `business`
  - account status: `active`, `paused`, `blocked`, `cancelled`
  - status reason
- Quick metrics:
  - customers
  - products
  - orders
  - revenue
  - courses
- Tenant members:
  - owner/editor list
  - role
  - status
  - email confirmed
  - last sign-in
- Recent orders.
- Recent customers.
- Integrations summary.
- Audit log.

### Actions

Tenant-level actions:

- Update name.
- Update slug.
- Change plan.
- Pause tenant.
- Reactivate tenant.
- Block tenant.
- Cancel tenant.
- Open public portal.
- Open tenant admin route.

Member-level actions:

- Change member role: `owner` / `editor`.
- Pause member.
- Reactivate member.
- Resend invite/access email.

### Acceptance Criteria

- A Superadmin can click a tenant from the tenant table and open its detail page.
- A Superadmin can change the tenant plan to `free`, `pro`, or `business`.
- Pro-only controls in tenant admin become available when plan is `pro` or `business`.
- A Superadmin can pause and reactivate tenant access.
- A Superadmin can pause and reactivate tenant members.
- Every write action creates an audit log entry.
- Non-admin users cannot call these actions.

## Phase 2: Backend For Superadmin Actions

### Edge Function

Create:

```text
supabase/functions/superadmin-tenant-admin/index.ts
```

Supported actions:

- `get_tenant_detail`
- `update_tenant`
- `update_plan`
- `update_status`
- `update_member_role`
- `update_member_status`
- `resend_member_invite`
- `list_audit_logs`

### Security

Every request must:

- Authenticate the current user.
- Validate platform role with `is_admin()`.
- Use service role only inside the Edge Function.
- Validate input shape.
- Avoid exposing secrets such as integration credentials or Gumlet signed URL secrets.
- Write an audit log for every mutation.

### Example Request

```json
{
  "action": "update_plan",
  "tenant_id": "uuid",
  "plan": "pro"
}
```

### Example Response

```json
{
  "success": true,
  "tenant_id": "uuid",
  "plan": "pro"
}
```

## Phase 3: Database Schema

### Tenant Account Status

Add fields to `tenant_settings`:

```sql
alter table public.tenant_settings
  add column if not exists account_status text not null default 'active',
  add column if not exists account_status_reason text,
  add column if not exists account_status_updated_at timestamptz;
```

Recommended allowed values:

- `active`
- `paused`
- `blocked`
- `cancelled`

Add a check constraint:

```sql
alter table public.tenant_settings
  add constraint tenant_settings_account_status_check
  check (account_status in ('active', 'paused', 'blocked', 'cancelled'));
```

### Platform Plans

Create `platform_plans`:

```sql
create table if not exists public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'BRL',
  is_active boolean not null default true,
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Seed initial plans:

- `free`
- `pro`
- `business`

Example `features`:

```json
{
  "ai_captions": false,
  "caption_display": false,
  "video_protection": false,
  "video_progress_tracking": false,
  "manual_enrollment": false,
  "hosting": false,
  "integrations": {
    "openai": false,
    "anthropic": false,
    "hotmart": true,
    "nory": true,
    "vimeo": true,
    "pandavideo": true,
    "wistia": true
  }
}
```

Example `limits`:

```json
{
  "team_members": 1,
  "customers": 100,
  "storage_gb": 5,
  "courses": 3
}
```

### Superadmin Audit Logs

Create `superadmin_audit_logs`:

```sql
create table if not exists public.superadmin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  target_type text not null,
  target_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Read policy:

- Only `is_admin()` can read audit logs.

Write policy:

- Prefer writes through the service role inside Edge Functions.

## Phase 4: Plan Configuration UI

Add:

```text
/superadmin/plans
```

This page should allow platform admins to configure:

- plan name
- public description
- price
- active/inactive status
- feature flags
- usage limits

Initial feature toggles:

- AI caption generation
- Caption display
- Video protection
- Video progress tracking
- Manual enrollment
- Hosting
- Payment integrations
- Video provider integrations
- AI provider integrations

### Acceptance Criteria

- A Superadmin can update plan feature flags.
- Tenant plan assignment reads from `platform_plans`.
- Product UI can determine features from plan configuration, not only hardcoded checks.

## Phase 5: Apply Account Status Across Product

The product should respect `tenant_settings.account_status`.

### Admin Console

If tenant status is:

- `active`: normal access.
- `paused`: block tenant admin access with a clear message.
- `blocked`: block tenant admin access with a stricter message.
- `cancelled`: block tenant admin access and suggest contacting support.

### Customer Portal

Decide policy per status:

- `paused`: optionally keep customer portal online.
- `blocked`: block customer portal.
- `cancelled`: block customer portal.

This should be explicit in product rules, not accidental.

### Edge Functions

Critical tenant-scoped functions should reject writes for paused/blocked/cancelled tenants where appropriate.

Examples:

- asset upload
- integration connect
- product creation/update
- checkout/process actions
- AI generation

## Phase 6: Customer And Access Operations

After tenant detail is stable, add access management:

- list customers for tenant
- pause customer access
- reactivate customer access
- resend customer portal access
- grant product/course access manually
- remove product/course access
- show access history

Candidate route:

```text
/superadmin/tenants/:tenantId/customers/:customerId
```

Or keep the first version inside tabs on tenant detail.

## Phase 7: Orders And Integrations Operations

Add operational actions:

Orders:

- view order detail
- reprocess access
- resend order/access email
- correct customer/product link
- change status with audit log

Integrations:

- list connected integrations per tenant
- show status and last error
- disconnect integration
- reprocess webhook/event
- view recent gateway logs

## Implementation Order

1. Add database migration for `account_status`, `platform_plans`, and `superadmin_audit_logs`.
2. Create `superadmin-tenant-admin` Edge Function.
3. Create frontend hook `useSuperadminTenantDetail`.
4. Add route `/superadmin/tenants/:tenantId`.
5. Make tenant rows clickable.
6. Implement tenant detail read-only view.
7. Add edit controls for name, slug, plan, and status.
8. Add member actions.
9. Add audit log tab.
10. Add `/superadmin/plans`.
11. Replace hardcoded feature checks with plan feature resolution.
12. Add customer access operations.
13. Add order and integration operations.

## Testing Checklist

Frontend:

```bash
npx tsc --noEmit
npm run build
```

Backend:

- Deploy migration locally or to staging.
- Deploy `superadmin-tenant-admin`.
- Verify non-admin user receives 403.
- Verify admin can update tenant plan.
- Verify admin can pause and reactivate tenant.
- Verify audit log is created for every mutation.
- Verify Pro-only video options unlock after changing tenant plan to `pro`.
- Verify paused/blocked tenants are prevented from accessing restricted areas.

## Operational Notes

- Avoid hard deletes for tenants, users, and customers in Superadmin.
- Prefer status changes with audit logs.
- Keep service-role operations inside Edge Functions only.
- Do not expose secret fields in frontend responses.
- Every destructive or access-changing action should require an explicit confirmation in UI.

