import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Server, Plus, Trash2, Loader2, RotateCcw, ExternalLink } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edge-function-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Capabilities { dns?: boolean; wordpress?: boolean; status?: boolean; dns_reset?: boolean }
interface SiteInfo { domain: string; username: string | null; vhostType: string | null; status: string; capabilities: Capabilities }
interface WpInstall { id?: string; domain?: string; url?: string; siteTitle?: string; login?: string; directory?: string; isValid?: boolean }
interface DnsRecord { uid: string; name: string; type: string; ttl: number; content: string }

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

function uid() { return crypto.randomUUID(); }

export default function AdminHostingSite() {
  const { domain = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dom = decodeURIComponent(domain);

  const { data: info, isLoading: loadingInfo, error: infoError } = useQuery({
    queryKey: ["hosting-site-info", dom],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "site_info", domain: dom } });
      return data as SiteInfo;
    },
  });

  const caps = info?.capabilities ?? {};

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <button
          onClick={() => navigate("/admin/hosting")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Hospedagem e Emails
        </button>

        <div className="flex items-center gap-2">
          <Server className="size-6" />
          <div>
            <h1 className="text-title">{dom}</h1>
            {info && (
              <p className="text-sm text-muted-foreground">
                {info.vhostType ?? "site"}{info.username ? ` · ${info.username}` : ""}
                <Badge className="ml-2" variant={info.status === "active" ? "success" : "outline"}>{info.status}</Badge>
              </p>
            )}
          </div>
        </div>

        {loadingInfo ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : infoError || !info ? (
          <p className="text-sm text-destructive">Não foi possível carregar este site ou você não tem acesso a ele.</p>
        ) : (
          <Tabs defaultValue={caps.wordpress ? "wordpress" : caps.dns ? "dns" : "status"}>
            <TabsList>
              {caps.status && <TabsTrigger value="status">Status</TabsTrigger>}
              {caps.wordpress && <TabsTrigger value="wordpress">WordPress</TabsTrigger>}
              {(caps.dns || caps.dns_reset) && <TabsTrigger value="dns">DNS</TabsTrigger>}
            </TabsList>

            {caps.status && <TabsContent value="status"><StatusTab domain={dom} /></TabsContent>}
            {caps.wordpress && <TabsContent value="wordpress"><WordPressTab domain={dom} onDone={() => qc.invalidateQueries({ queryKey: ["wp-list", dom] })} /></TabsContent>}
            {(caps.dns || caps.dns_reset) && <TabsContent value="dns"><DnsTab domain={dom} canEdit={!!caps.dns} canReset={!!caps.dns_reset} /></TabsContent>}
          </Tabs>
        )}
      </div>
    </div>
  );
}

/* ─── Status ─── */
function StatusTab({ domain }: { domain: string }) {
  const { data: installs = [], isLoading } = useQuery({
    queryKey: ["wp-list", domain],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_list", domain } });
      const r = data as { ok: boolean; data: WpInstall[] | null };
      return r?.data ?? [];
    },
  });

  return (
    <Card variant="bordered" className="mt-4">
      <CardHeader><CardTitle>Instalações WordPress</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : installs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma instalação WordPress encontrada neste domínio.</p>
        ) : installs.map((w, i) => (
          <div key={w.id ?? i} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{w.siteTitle || w.url || domain}</p>
              <p className="text-xs text-muted-foreground truncate">{w.url}{w.directory ? ` · ${w.directory}` : ""}</p>
            </div>
            {w.url && (
              <a href={w.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── WordPress ─── */
function WordPressTab({ domain, onDone }: { domain: string; onDone: () => void }) {
  const [siteTitle, setSiteTitle] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminLogin, setAdminLogin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (overwrite: boolean) => {
    if (!adminEmail.trim() || !adminLogin.trim() || !adminPassword) {
      toast.error("Preencha e-mail, usuário e senha do admin.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", {
        body: {
          action: overwrite ? "wp_reinstall" : "wp_install",
          domain, siteTitle, adminEmail, adminLogin, adminPassword,
        },
      });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 400)); return; }
      toast.success("Instalação iniciada! Leva ~1-2 min para concluir.");
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  };

  return (
    <Card variant="bordered" className="mt-4">
      <CardHeader><CardTitle>Instalar / Reinstalar WordPress</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-sm text-destructive break-words">Erro: {err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Título do site" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
          <Input type="email" placeholder="E-mail do admin" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          <Input placeholder="Usuário admin" value={adminLogin} onChange={(e) => setAdminLogin(e.target.value)} />
          <Input type="password" placeholder="Senha do admin" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => run(false)}>{busy ? <Loader2 className="size-4 animate-spin" /> : "Instalar WordPress"}</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={busy}>Reinstalar (apaga o atual)</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reinstalar WordPress?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso substitui a instalação existente em {domain}. O conteúdo atual do site pode ser perdido. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => run(true)}>Reinstalar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-xs text-muted-foreground">
          O site precisa já existir na hospedagem. A instalação é assíncrona — acompanhe em "Status" após ~1-2 min.
        </p>
      </CardContent>
    </Card>
  );
}

/* ─── DNS ─── */
function DnsTab({ domain, canEdit, canReset }: { domain: string; canEdit: boolean; canReset: boolean }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<DnsRecord[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useQuery({
    queryKey: ["dns", domain],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "dns_get", domain } });
      const r = data as { ok: boolean; data: unknown; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 300)); setRows([]); return []; }
      const zone = (Array.isArray(r.data) ? r.data : (r.data as { data?: unknown[] })?.data ?? []) as {
        name: string; type: string; ttl: number; records: { content: string }[];
      }[];
      const flat: DnsRecord[] = [];
      for (const z of zone) {
        for (const rec of z.records ?? []) {
          flat.push({ uid: uid(), name: z.name, type: z.type, ttl: z.ttl ?? 14400, content: rec.content });
        }
      }
      setRows(flat);
      return flat;
    },
  });

  const update = (id: string, patch: Partial<DnsRecord>) =>
    setRows((prev) => prev?.map((r) => (r.uid === id ? { ...r, ...patch } : r)) ?? null);
  const remove = (id: string) => setRows((prev) => prev?.filter((r) => r.uid !== id) ?? null);
  const add = () => setRows((prev) => [...(prev ?? []), { uid: uid(), name: "@", type: "A", ttl: 14400, content: "" }]);

  const save = async () => {
    if (!rows) return;
    // Reagrupa por (name, type) → { name, type, ttl, records: [{content}] }
    const groups = new Map<string, { name: string; type: string; ttl: number; records: { content: string }[] }>();
    for (const r of rows) {
      if (!r.content.trim()) continue;
      const key = `${r.name}__${r.type}`;
      if (!groups.has(key)) groups.set(key, { name: r.name || "@", type: r.type, ttl: Number(r.ttl) || 14400, records: [] });
      groups.get(key)!.records.push({ content: r.content.trim() });
    }
    setSaving(true); setErr(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "dns_update", domain, zone: [...groups.values()] } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 400)); return; }
      toast.success("DNS atualizado.");
      await qc.invalidateQueries({ queryKey: ["dns", domain] });
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    setResetting(true); setErr(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "dns_reset", domain } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 400)); return; }
      toast.success("DNS restaurado para o padrão.");
      await qc.invalidateQueries({ queryKey: ["dns", domain] });
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setResetting(false); }
  };

  return (
    <Card variant="bordered" className="mt-4">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Registros DNS</CardTitle>
        {canReset && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={resetting}>
                <RotateCcw className="size-4 mr-1.5" /> Resetar DNS
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar DNS?</AlertDialogTitle>
                <AlertDialogDescription>
                  Restaura a zona DNS de {domain} para a configuração original da Hostinger. Registros personalizados serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={reset}>Resetar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-sm text-destructive break-words">Erro: {err}</p>}
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.uid} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                  <Input className="w-28" placeholder="Nome" value={r.name} disabled={!canEdit} onChange={(e) => update(r.uid, { name: e.target.value })} />
                  <Select value={r.type} disabled={!canEdit} onValueChange={(v) => update(r.uid, { type: v })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{DNS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="min-w-[10rem] flex-1" placeholder="Conteúdo" value={r.content} disabled={!canEdit} onChange={(e) => update(r.uid, { content: e.target.value })} />
                  <Input className="w-20" type="number" placeholder="TTL" value={r.ttl} disabled={!canEdit} onChange={(e) => update(r.uid, { ttl: Number(e.target.value) })} />
                  {canEdit && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(r.uid)}><Trash2 className="size-4" /></Button>
                  )}
                </div>
              ))}
              {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro.</p>}
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={add}><Plus className="size-4 mr-1.5" /> Adicionar registro</Button>
                <Button size="sm" disabled={saving} onClick={save}>{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar DNS"}</Button>
              </div>
            )}
            {!canEdit && <p className="text-xs text-muted-foreground">Visualização apenas — edição de DNS não liberada para este site.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
