import { useTranslation } from "react-i18next";
import { PauseCircle, Ban, XCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Status = "paused" | "blocked" | "cancelled" | string;

const ICONS: Record<string, typeof Ban> = {
  paused: PauseCircle,
  blocked: Ban,
  cancelled: XCircle,
};

/**
 * Tela de bloqueio quando o tenant esta com account_status != active.
 * Usada tanto no admin do tenant quanto no portal do cliente (Fase 5).
 */
export function TenantStatusBlock({
  status,
  reason,
  context,
}: {
  status: Status;
  reason?: string | null;
  context: "admin" | "portal";
}) {
  const { t } = useTranslation();
  const Icon = ICONS[status] ?? Ban;

  const key = (s: string) => `tenantStatus.${context}.${s}`;
  const title = t(key(`${status}.title`), { defaultValue: t("tenantStatus.genericTitle", { defaultValue: "Acesso indisponível" }) });
  const description = t(key(`${status}.description`), {
    defaultValue: t("tenantStatus.genericDescription", {
      defaultValue: "Esta conta está temporariamente indisponível. Entre em contato com o suporte.",
    }),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = context === "admin" ? "/admin/login" : "/";
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <Icon className="size-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        {reason && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{reason}</p>
        )}
      </div>
      {context === "admin" && (
        <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="size-4" />
          {t("tenantStatus.signOut", { defaultValue: "Sair" })}
        </Button>
      )}
    </div>
  );
}
