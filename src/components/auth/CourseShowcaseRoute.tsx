import { Navigate, useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantBySlug } from "@/hooks/useTenantBySlug";
import { TenantStatusBlock } from "@/components/TenantStatusBlock";

interface CourseShowcaseRouteProps {
  children: React.ReactNode;
}

export function CourseShowcaseRoute({ children }: CourseShowcaseRouteProps) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: tenant, isLoading: tenantLoading } = useTenantBySlug(tenantSlug);

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Enforcement de account_status (Fase 5): conta bloqueada/cancelada → portal off.
  if (tenant && (tenant.account_status === "blocked" || tenant.account_status === "cancelled")) {
    return <TenantStatusBlock status={tenant.account_status} context="portal" />;
  }

  if (!user) {
    return (
      <Navigate
        to={`/${tenantSlug}/login`}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}
