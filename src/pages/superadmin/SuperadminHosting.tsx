import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plug, Globe, Server, Check, X, Search, Settings, Link2, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edge-function-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RawItem { domain?: string; name?: string; status?: string; id?: string | number; username?: string; type?: string; vhostType?: string; isEnabled?: boolean }
interface CatalogEntry { label: string; kind: "site" | "domain"; externalId: string | null; username: string | null; vhostType: string | null; status?: string }
interface Capabilities { dns?: boolean; wordpress?: boolean; status?: boolean; dns_reset?: boolean; subdomains?: boolean }
interface Assignment { id: string; domain: string; tenant_id: string; hosting_username: string | null; vhost_type: string | null; capabilities: Capabilities | null; status: string; tenants?: { name: string; slug: string } | null }
interface HostingRequest { id: string; tenant_id: string; note: string | null; created_at: string; tenants?: { name: string; slug: string } | null }

const CAPS: { key: keyof Capabilities; label: string }[] = [
  { key: "status", label: "Ver status" },
  { key: "dns", label: "Editar DNS" },
  { key: "wordpress", label: "WordPress" },
  { key: "dns_reset", label: "Resetar DNS" },
  { key: "subdomains", label: "Subdomínios" },
];

/** Campo de busca reaproveitável (ícone à esquerda). */
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function SuperadminHosting() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [assignTenant, setAssignTenant] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [linkSearch, setLinkSearch] = useState("");

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

  const toArray = (payload: unknown): RawItem[] => {
    if (Array.isArray(payload)) return payload as RawItem[];
    const d = (payload as { data?: RawItem[] } | null)?.data;
    return Array.isArray(d) ? d : [];
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true); setCatalogError(null);
    try {
      const [sitesRes, domainsRes] = await Promise.all([
        invokeEdgeFunction("hostinger-admin", { body: { action: "list_websites" } }),
        invokeEdgeFunction("hostinger-admin", { body: { action: "list_domains" } }),
      ]);
      const sitesR = sitesRes.data as { ok: boolean; websites: unknown; raw: unknown };
      const domainsR = domainsRes.data as { ok: boolean; domains: unknown; raw: unknown };

      const errors: string[] = [];
      if (!sitesR?.ok && sitesR?.raw) errors.push(`Sites: ${JSON.stringify(sitesR.raw).slice(0, 150)}`);
      if (!domainsR?.ok && domainsR?.raw) errors.push(`Domínios: ${JSON.stringify(domainsR.raw).slice(0, 150)}`);

      const entries = new Map<string, CatalogEntry>();
      for (const w of toArray(sitesR?.ok ? sitesR.websites : null)) {
        const label = (w.domain || w.name || "").toLowerCase().trim();
        if (!label) continue;
        entries.set(label, {
          label, kind: "site",
          externalId: String(w.id ?? "") || null,
          username: w.username ?? null,
          vhostType: w.vhostType ?? w.type ?? null,
          status: w.isEnabled === false ? "disabled" : (w.status ?? "active"),
        });
      }
      for (const d of toArray(domainsR?.ok ? domainsR.domains : null)) {
        const label = (d.domain || d.name || "").toLowerCase().trim();
        if (!label || entries.has(label)) continue;
        entries.set(label, { label, kind: "domain", externalId: String(d.id ?? "") || null, username: null, vhostType: null, status: d.status });
      }

      const list = [...entries.values()].sort((a, b) => a.label.localeCompare(b.label));
      setCatalog(list);
      if (list.length === 0 && errors.length) setCatalogError(errors.join(" · "));
      else setCatalogError(null);
    } catch (e) { setCatalogError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoadingCatalog(false); }
  };

  const assign = async (entry: CatalogEntry) => {
    const tenantId = assignTenant[entry.label];
    if (!tenantId) { toast.error("Selecione um tenant."); return; }
    setBusy(entry.label);
    try {
      await invokeEdgeFunction("hostinger-admin", {
        body: {
          action: "assign", tenantId, domain: entry.label,
          externalId: entry.externalId, username: entry.username, vhostType: entry.vhostType,
          capabilities: { status: true }, // por padrão só "ver status"; demais liberados nos toggles
        },
      });
      await qc.invalidateQueries({ queryKey: ["hosting-assignments"] });
      toast.success(entry.kind === "site" ? "Site vinculado." : "Domínio vinculado.");
    } catch { toast.error("Falha ao vincular."); }
    finally { setBusy(null); }
  };

  const toggleCapability = async (a: Assignment, cap: keyof Capabilities) => {
    const next = { ...(a.capabilities ?? {}), [cap]: !a.capabilities?.[cap] };
    setBusy(a.id);
    try {
      await invokeEdgeFunction("hostinger-admin", { body: { action: "set_capabilities", id: a.id, capabilities: next } });
      await qc.invalidateQueries({ queryKey: ["hosting-assignments"] });
    } catch { toast.error("Falha ao atualizar recursos."); }
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

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!catalog) return null;
    return q ? catalog.filter((e) => e.label.includes(q)) : catalog;
  }, [catalog, catalogSearch]);

  const filteredAssignments = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) =>
      a.domain.toLowerCase().includes(q) ||
      (a.tenants?.name ?? "").toLowerCase().includes(q) ||
      (a.hosting_username ?? "").toLowerCase().includes(q)
    );
  }, [assignments, linkSearch]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-1">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Plug className="size-5" /> Apps e Integrações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hospedagem e Emails (Hostinger) — configuração da plataforma.</p>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog"><Server className="size-4 mr-1.5" /> Sites &amp; domínios</TabsTrigger>
          <TabsTrigger value="links"><Link2 className="size-4 mr-1.5" /> Vínculos{assignments.length > 0 && <Badge variant="outline" className="ml-1.5">{assignments.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="requests"><Inbox className="size-4 mr-1.5" /> Solicitações{requests.length > 0 && <Badge variant="success" className="ml-1.5">{requests.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="config"><Settings className="size-4 mr-1.5" /> Configuração</TabsTrigger>
        </TabsList>

        {/* ─── Sites e domínios ─── */}
        <TabsContent value="catalog">
          <Card variant="bordered" className="mt-4">
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>Sites e domínios</CardTitle>
              <Button variant="secondary" size="sm" onClick={loadCatalog} disabled={loadingCatalog || !status?.configured}>
                {loadingCatalog ? <Loader2 className="size-4 animate-spin" /> : "Carregar da Hostinger"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!status?.configured && (
                <p className="text-sm text-muted-foreground">Configure a API key na aba "Configuração" para listar os sites.</p>
              )}
              {catalogError && <p className="text-sm text-destructive">Erro ao buscar: {catalogError}</p>}
              {catalog === null ? (
                status?.configured && <p className="text-sm text-muted-foreground">Clique em "Carregar da Hostinger" para listar todos os sites e domínios.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1"><SearchBox value={catalogSearch} onChange={setCatalogSearch} placeholder="Buscar site ou domínio..." /></div>
                    <span className="shrink-0 text-xs text-muted-foreground">{filteredCatalog?.length ?? 0} de {catalog.length}</span>
                  </div>
                  {(filteredCatalog?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum resultado.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredCatalog!.map((entry) => (
                        <div key={entry.label} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="inline-flex items-center gap-2 text-sm font-medium">
                            {entry.kind === "site" ? <Server className="size-4 text-primary" /> : <Globe className="size-4" />}
                            {entry.label}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                              {entry.kind === "site" ? "Site" : "Domínio"}
                            </span>
                          </span>
                          <div className="flex items-center gap-2">
                            <Select value={assignTenant[entry.label] ?? ""} onValueChange={(v) => setAssignTenant((p) => ({ ...p, [entry.label]: v }))}>
                              <SelectTrigger className="w-48"><SelectValue placeholder="Vincular a um tenant" /></SelectTrigger>
                              <SelectContent>
                                {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button size="sm" disabled={busy === entry.label} onClick={() => assign(entry)}>Vincular</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Vínculos ─── */}
        <TabsContent value="links">
          <Card variant="bordered" className="mt-4">
            <CardHeader><CardTitle>Sites vinculados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum site vinculado ainda.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1"><SearchBox value={linkSearch} onChange={setLinkSearch} placeholder="Buscar por domínio, tenant ou conta..." /></div>
                    <span className="shrink-0 text-xs text-muted-foreground">{filteredAssignments.length} de {assignments.length}</span>
                  </div>
                  {filteredAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum resultado.</p>
                  ) : filteredAssignments.map((a) => (
                    <div key={a.id} className="space-y-3 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.domain}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.tenants?.name ?? a.tenant_id}{a.hosting_username ? ` · conta: ${a.hosting_username}` : ""}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" disabled={busy === a.id} onClick={() => unassign(a.id)}>Remover</Button>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {CAPS.map((c) => (
                          <label key={c.key} className="inline-flex cursor-pointer items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              className="size-3.5 accent-primary"
                              checked={!!a.capabilities?.[c.key]}
                              disabled={busy === a.id}
                              onChange={() => toggleCapability(a, c.key)}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Solicitações ─── */}
        <TabsContent value="requests">
          <Card variant="bordered" className="mt-4">
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
        </TabsContent>

        {/* ─── Configuração (API key) ─── */}
        <TabsContent value="config">
          <Card variant="bordered" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
