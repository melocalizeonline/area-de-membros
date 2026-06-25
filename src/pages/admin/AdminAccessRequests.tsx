import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edge-function-utils";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RequestRow {
  id: string;
  course_id: string | null;
  product_id: string | null;
  user_id: string;
  created_at: string;
  courses: { title: string } | null;
  products: { name: string } | null;
  customer?: { name: string | null; email: string };
}

export default function AdminAccessRequests() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["access-requests", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("access_requests")
        .select("id, course_id, product_id, user_id, created_at, courses(title), products(name)")
        .eq("tenant_id", tenantId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const list = (reqs ?? []) as unknown as RequestRow[];
      const userIds = [...new Set(list.map((r) => r.user_id))];
      let custMap: Record<string, { name: string | null; email: string }> = {};
      if (userIds.length) {
        const { data: custs } = await supabase
          .from("customers")
          .select("user_id, name, email")
          .eq("tenant_id", tenantId!)
          .in("user_id", userIds);
        custMap = Object.fromEntries(
          (custs ?? []).map((c) => [c.user_id, { name: c.name, email: c.email }]),
        );
      }
      return list.map((r) => ({ ...r, customer: custMap[r.user_id] }));
    },
  });

  const resolve = async (id: string, action: "approve" | "reject") => {
    if (!tenantId) return;
    setBusy(id);
    try {
      await invokeEdgeFunction("resolve-access-request", {
        body: { tenantId, requestId: id, action },
      });
      await queryClient.invalidateQueries({ queryKey: ["access-requests", tenantId] });
      toast.success(action === "approve" ? "Acesso liberado." : "Solicitação recusada.");
    } catch {
      toast.error("Não foi possível processar agora.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-1">
      <div>
        <h1 className="text-xl font-semibold">Solicitações de acesso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alunos que pediram acesso a cursos marcados como "apenas ver".
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhuma solicitação pendente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando um aluno solicitar acesso a um curso, aparece aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} variant="bordered">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {r.courses?.title ?? r.products?.name ?? "Item"}
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      {r.product_id ? "Produto" : "Curso"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {r.customer?.name || r.customer?.email || "Aluno"}
                    {r.customer?.name && r.customer?.email ? ` · ${r.customer.email}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === r.id}
                    onClick={() => resolve(r.id, "reject")}
                  >
                    <X className="size-3.5 mr-1" /> Recusar
                  </Button>
                  <Button size="sm" disabled={busy === r.id} onClick={() => resolve(r.id, "approve")}>
                    <Check className="size-3.5 mr-1" /> Aprovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
