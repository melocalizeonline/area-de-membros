import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Globe, Mail, Server, Clock, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Capabilities { dns?: boolean; wordpress?: boolean; status?: boolean; dns_reset?: boolean }
interface Assignment { id: string; domain: string; provider: string; status: string; capabilities: Capabilities | null }

export default function AdminHosting() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const tenantId = tenant?.id;

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["tenant-hosting-assignments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("hosting_assignments")
        .select("id, domain, provider, status, capabilities")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as Assignment[];
    },
  });

  const { data: pendingRequest } = useQuery({
    queryKey: ["tenant-hosting-request", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("hosting_requests")
        .select("id, status, created_at")
        .eq("tenant_id", tenantId!)
        .eq("status", "pending")
        .maybeSingle();
      return data as { id: string; status: string; created_at: string } | null;
    },
  });

  const requestHosting = async () => {
    if (!tenantId || !user?.id) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from("hosting_requests").insert({
        tenant_id: tenantId,
        user_id: user.id,
        note: "Solicitação de hospedagem/domínio via Apps e Integrações.",
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["tenant-hosting-request", tenantId] });
      toast.success("Solicitação enviada! Em breve entraremos em contato.");
    } catch {
      toast.error("Não foi possível enviar a solicitação.");
    } finally {
      setRequesting(false);
    }
  };

  const hasHosting = assignments.length > 0;

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <button
          onClick={() => navigate("/admin/integrations")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("integrations.title")}
        </button>

        <div>
          <h1 className="text-title flex items-center gap-2"><Server className="size-6" /> Hospedagem e Emails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie a hospedagem e os domínios contratados com a Nory Members.
          </p>
        </div>

        {/* Domínios contratados */}
        <Card variant="bordered">
          <CardHeader><CardTitle>Seus domínios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loadingAssignments ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : hasHosting ? (
              assignments.map((a) => {
                const hasTools = a.capabilities && Object.values(a.capabilities).some(Boolean);
                return (
                  <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <Globe className="size-4" /> {a.domain}
                      <Badge variant={a.status === "active" ? "success" : "outline"}>
                        {a.status === "active" ? "Ativo" : a.status}
                      </Badge>
                    </span>
                    {hasTools && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/hosting/${encodeURIComponent(a.domain)}`)}>
                        <Settings2 className="size-4 mr-1.5" /> Gerenciar
                      </Button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você ainda não possui hospedagem ou domínio vinculado. Solicite e nossa equipe configura para você.
                </p>
                {pendingRequest ? (
                  <Badge variant="outline" className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Solicitação enviada — em análise
                  </Badge>
                ) : (
                  <Button onClick={requestHosting} disabled={requesting}>
                    {requesting ? "Enviando..." : "Solicitar hospedagem"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emails — em breve */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="size-4" /> Emails profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de contas de e-mail (criar caixas, redefinir senha, ver logs) estará disponível em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
