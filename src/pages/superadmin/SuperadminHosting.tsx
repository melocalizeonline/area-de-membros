import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plug, Globe, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edge-function-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DomainItem { domain?: string; name?: string; status?: string; id?: string | number }
interface Assignment { id: string; domain: string; tenant_id: string; status: string; tenants?: { name: string; slug: string } | null }
interface HostingRequest { id: string; tenant_id: string; note: string | null; created_at: string; tenants?: { name: string; slug: string } | null }

export default function SuperadminHosting() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [domains, setDomains] = useState<DomainItem[] | null>(null);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [assignTenant, setAssignTenant] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: status } = useQuery({
    queryKey: ["hostinger-status"],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-admin", { body: { action: "status" } });
      return data as { configured: boolean; hint: string | null };
    },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["superadmin-tenants-min"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name, slug").order("name");
      return (data ?? []) as { id: string; name: string; slug: string }[];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["hosting-assignments"],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-admin", { body: { action: "list_assignments" } });
      return ((data as { assignments: Assignment[] })?.assignments) ?? [];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["hosting-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hosting_requests")
        .select("id, tenant_id, note, created_at, tenants(name, slug)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as HostingRequest[];
    },
  });

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    try {
      await invokeEdgeFunction("hostinger-admin", { body: { action: "save_key", apiKey: apiKey.trim() } });
      setApiKey("");
      await qc.invalidateQueries({ queryKey: ["hostinger-status"] });
      toast.success("API key salva.");
    } catch { toast.error("Falha ao salvar a API key."); }
    finally { setSavingKey(false); }
  };

  const loadDomains = async () => {
    setLoadingDomains(true); setDomainsError(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-admin", { body: { action: "list_domains" } });
      const r = data as { ok: boolean; domains: unknown; raw: unknown };
      if (!r.ok) { setDomainsError(JSON.stringify(r.raw).slice(0, 300)); setDomains([]); return; }
      const list = Array.isArray(r.domains) ? r.domains : (r.domains as { data?: DomainItem[] })?.data ?? [];
      setDomains(list as DomainItem[]);
    } catch (e) { setDomainsError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoadingDomains(false); }
  };

  const assign = async (domain: string) => {
    const tenantId = assignTenant[domain];
    if (!tenantId) { toast.error("Selecione um tenant."); return; }
    setBusy(domain);
    try {
      await invokeEdgeFunction("hostinger-admin", { body: { action: "assign", tenantId, domain } });
      await qc.invalidateQueries({ queryKey: ["hosting-assignments"] });
      toast.success("Domínio vinculado.");
    } catch { toast.error("Falha ao vincular."); }
    finally { setBusy(null); }
  };

  const unassign = async (id: string) => {
    setBusy(id);
    try {
      await invokeEdgeFunction("hostinger-admin", { body: { action: "unassign", id } });
      await qc.invalidateQueries({ queryKey: ["hosting-assignments"] });
      toast.success("Vínculo removido.");
    } catch { toast.error("Falha ao remover."); }
    finally { setBusy(null); }
  };

  const resolveRequest = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      await supabase.from("hosting_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      await qc.invalidateQueries({ queryKey: ["hosting-requests"] });
      toast.success(status === "approved" ? "Solicitação aprovada." : "Solicitação recusada.");
    } catch { toast.error("Falha ao processar."); }
    finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-1">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Plug className="size-5" /> Apps e Integrações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hospedagem e Emails (Hostinger) — configuração da plataforma.</p>
      </div>

      {/* API key */}
      <Card variant="bordered">
        <CardHeader><CardTitle>API da Hostinger</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {status?.configured ? `Configurada (${status.hint}).` : "Nenhuma API key configurada."}
          </p>
          <div className="flex gap-2">
            <Input type="password" placeholder="Cole a API key da Hostinger" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <Button onClick={saveKey} disabled={savingKey || !apiKey.trim()}>{savingKey ? "Salvando..." : "Salvar"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Domínios */}
      <Card variant="bordered">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Domínios</CardTitle>
          <Button variant="secondary" size="sm" onClick={loadDomains} disabled={loadingDomains || !status?.configured}>
            {loadingDomains ? <Loader2 className="size-4 animate-spin" /> : "Carregar domínios"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {domainsError && <p className="text-sm text-destructive">Erro ao buscar: {domainsError}</p>}
          {domains === null ? (
            <p className="text-sm text-muted-foreground">Clique em "Carregar domínios" para listar da Hostinger.</p>
          ) : domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum domínio retornado.</p>
          ) : (
            <div className="space-y-2">
              {domains.map((d, i) => {
                const dom = d.domain || d.name || String(d.id ?? i);
                return (
                  <div key={dom} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-medium"><Globe className="size-4" /> {dom}</span>
                    <div className="flex items-center gap-2">
                      <Select value={assignTenant[dom] ?? ""} onValueChange={(v) => setAssignTenant((p) => ({ ...p, [dom]: v }))}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Vincular a um tenant" /></SelectTrigger>
                        <SelectContent>
                          {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" disabled={busy === dom} onClick={() => assign(dom)}>Vincular</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vínculos */}
      <Card variant="bordered">
        <CardHeader><CardTitle>Domínios vinculados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum domínio vinculado ainda.</p>
          ) : assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{a.domain}</p>
                <p className="text-xs text-muted-foreground">{a.tenants?.name ?? a.tenant_id}</p>
              </div>
              <Button variant="outline" size="sm" disabled={busy === a.id} onClick={() => unassign(a.id)}>Remover</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Solicitações */}
      <Card variant="bordered">
        <CardHeader><CardTitle>Solicitações de hospedagem</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
          ) : requests.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.tenants?.name ?? r.tenant_id}</p>
                {r.note && <p className="text-xs text-muted-foreground truncate">{r.note}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" disabled={busy === r.id} onClick={() => resolveRequest(r.id, "rejected")}><X className="size-3.5 mr-1" /> Recusar</Button>
                <Button size="sm" disabled={busy === r.id} onClick={() => resolveRequest(r.id, "approved")}><Check className="size-3.5 mr-1" /> Aprovar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
