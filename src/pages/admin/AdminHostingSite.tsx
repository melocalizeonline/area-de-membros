import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Server, Plus, Trash2, Loader2, RotateCcw, ExternalLink, Search, Globe, LayoutDashboard,
  Network, History, Plug,
} from "lucide-react";
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

interface Capabilities { dns?: boolean; wordpress?: boolean; status?: boolean; dns_reset?: boolean; subdomains?: boolean; wp_manage?: boolean }
interface SiteInfo { domain: string; username: string | null; vhostType: string | null; status: string; capabilities: Capabilities }
/** A API da Hostinger devolve snake_case; normalizamos para uso interno. */
interface WpInstall { id?: string; domain?: string; url?: string; siteTitle?: string; login?: string; email?: string; directory?: string; language?: string; isValid?: boolean }
interface DnsRecord { uid: string; name: string; type: string; ttl: number; content: string }

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

function uid() { return crypto.randomUUID(); }

function normalizeInstall(raw: Record<string, unknown>): WpInstall {
  const g = (a: string, b: string) => (raw[a] ?? raw[b]) as string | undefined;
  return {
    id: g("id", "id"),
    domain: g("domain", "domain"),
    url: g("url", "url"),
    siteTitle: g("site_title", "siteTitle"),
    login: g("login", "login"),
    email: g("email", "email"),
    directory: g("directory", "directory"),
    language: g("language", "language"),
    isValid: (raw["is_valid"] ?? raw["isValid"]) as boolean | undefined,
  };
}

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
      <div className="mx-auto w-full max-w-4xl space-y-6">
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
          <Tabs defaultValue={caps.status ? "overview" : caps.wordpress ? "wordpress" : "dns"}>
            <TabsList>
              {caps.status && <TabsTrigger value="overview"><LayoutDashboard className="size-4 mr-1.5" /> Visão geral</TabsTrigger>}
              {caps.wordpress && <TabsTrigger value="wordpress"><Globe className="size-4 mr-1.5" /> WordPress</TabsTrigger>}
              {(caps.dns || caps.dns_reset) && <TabsTrigger value="dns"><Server className="size-4 mr-1.5" /> DNS</TabsTrigger>}
              {caps.subdomains && <TabsTrigger value="subdomains"><Network className="size-4 mr-1.5" /> Subdomínios</TabsTrigger>}
            </TabsList>

            {caps.status && <TabsContent value="overview"><OverviewTab domain={dom} /></TabsContent>}
            {caps.wordpress && <TabsContent value="wordpress"><WordPressTab domain={dom} canManage={!!caps.wp_manage} onDone={() => qc.invalidateQueries({ queryKey: ["wp-list", dom] })} /></TabsContent>}
            {(caps.dns || caps.dns_reset) && <TabsContent value="dns"><DnsTab domain={dom} canEdit={!!caps.dns} canReset={!!caps.dns_reset} /></TabsContent>}
            {caps.subdomains && <TabsContent value="subdomains"><SubdomainsTab domain={dom} /></TabsContent>}
          </Tabs>
        )}
      </div>
    </div>
  );
}

/* ─── Hook compartilhado: lista de instalações WordPress ─── */
function useWpInstalls(domain: string) {
  return useQuery({
    queryKey: ["wp-list", domain],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_list", domain } });
      const r = data as { ok: boolean; data: Record<string, unknown>[] | null };
      return (r?.data ?? []).map(normalizeInstall);
    },
  });
}

/* ─── Visão geral ─── */
function OverviewTab({ domain }: { domain: string }) {
  const { data: installs = [], isLoading } = useWpInstalls(domain);

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
              <p className="text-sm font-medium truncate">
                {w.siteTitle || w.url || domain}
                {w.isValid === false && <Badge variant="outline" className="ml-2">inválida</Badge>}
              </p>
              <p className="text-xs text-muted-foreground truncate">{w.url}{w.directory ? ` · ${w.directory}` : ""}{w.login ? ` · admin: ${w.login}` : ""}</p>
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

/* ─── WordPress: seleção de instalação + instalar/reinstalar + gerenciar ─── */
function WordPressTab({ domain, canManage, onDone }: { domain: string; canManage: boolean; onDone: () => void }) {
  const { data: installs = [], isLoading } = useWpInstalls(domain);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => installs.find((w) => (w.id ?? w.url) === selectedId) ?? installs[0],
    [installs, selectedId],
  );

  return (
    <div className="mt-4 space-y-4">
      {/* Seletor de instalação (quando há mais de uma) */}
      {installs.length > 1 && (
        <Card variant="bordered">
          <CardHeader><CardTitle>Instalação</CardTitle></CardHeader>
          <CardContent>
            <Select value={(selected?.id ?? selected?.url) ?? ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full sm:w-96"><SelectValue placeholder="Selecione uma instalação" /></SelectTrigger>
              <SelectContent>
                {installs.map((w, i) => (
                  <SelectItem key={w.id ?? i} value={(w.id ?? w.url) ?? String(i)}>
                    {(w.siteTitle || w.url || domain)}{w.directory ? ` · ${w.directory}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Detalhes da instalação selecionada */}
      {!isLoading && selected && (
        <Card variant="bordered">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="truncate">{selected.siteTitle || selected.url || domain}</CardTitle>
            <div className="flex shrink-0 gap-2">
              {selected.url && (
                <Button asChild variant="outline" size="sm">
                  <a href={selected.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4 mr-1.5" /> Abrir site</a>
                </Button>
              )}
              {selected.url && (
                <Button asChild variant="outline" size="sm">
                  <a href={`${selected.url.replace(/\/$/, "")}/wp-admin`} target="_blank" rel="noreferrer">wp-admin</a>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <Detail label="URL" value={selected.url} />
            <Detail label="Admin (login)" value={selected.login} />
            <Detail label="E-mail" value={selected.email} />
            <Detail label="Diretório" value={selected.directory || "/"} />
            <Detail label="Idioma" value={selected.language} />
            <Detail label="Status" value={selected.isValid === false ? "Inválida" : "OK"} />
          </CardContent>
        </Card>
      )}

      {/* Gerenciar plugins (WP REST) */}
      {canManage && <WpManageSection domain={domain} wpUrl={selected?.url ?? null} />}

      {/* Instalar / Reinstalar */}
      <InstallForm domain={domain} hasInstall={installs.length > 0} onDone={onDone} />
    </div>
  );
}

/* ─── Gerenciar WordPress via REST (plugins + temas) ─── */
interface WpPlugin { plugin: string; slug?: string; name?: string; status?: string; version?: string; latest_version?: string | null; update_available?: boolean }
interface WpTheme { stylesheet?: string; name?: { rendered?: string } | string; status?: string; version?: string }

function WpManageSection({ domain, wpUrl }: { domain: string; wpUrl: string | null }) {
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");

  // Toast de retorno do fluxo authorize-application (?wp=connected|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wp = params.get("wp");
    if (wp === "connected") { toast.success("WordPress conectado!"); qc.invalidateQueries({ queryKey: ["wp-status", domain] }); }
    else if (wp === "error") { toast.error("Não foi possível conectar o WordPress."); }
    if (wp) {
      params.delete("wp");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, [domain, qc]);

  const { data: statusData } = useQuery({
    queryKey: ["wp-status", domain],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_status", domain } });
      return data as { connected: boolean; wpUrl: string | null; wpUser: string | null };
    },
  });
  const connected = !!statusData?.connected;
  const wpAdminUrl = statusData?.wpUrl ? `${statusData.wpUrl.replace(/\/$/, "")}/wp-admin` : null;

  const { data: plugins = [], isLoading: loadingPlugins, error: pluginsError } = useQuery({
    queryKey: ["wp-plugins", domain],
    enabled: connected,
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_plugins_list", domain } });
      const r = data as { ok: boolean; data: WpPlugin[] | null; raw: unknown };
      if (!r?.ok) throw new Error(JSON.stringify(r?.raw).slice(0, 200));
      return (r.data ?? []) as WpPlugin[];
    },
  });

  const { data: themes = [] } = useQuery({
    queryKey: ["wp-themes", domain],
    enabled: connected,
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_themes_list", domain } });
      const r = data as { ok: boolean; data: WpTheme[] | null };
      return (r?.data ?? []) as WpTheme[];
    },
  });

  // URL de conexão editável — sempre normalizada para https (exigência do WordPress).
  const toHttps = (u: string) => `https://${u.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "")}`;
  const [connectUrl, setConnectUrl] = useState("");
  useEffect(() => {
    if (wpUrl && !connectUrl) setConnectUrl(toHttps(wpUrl));
  }, [wpUrl, connectUrl]);

  const connect = async () => {
    const target = toHttps(connectUrl || wpUrl || domain);
    if (target === "https://") { toast.error("Informe a URL do site."); return; }
    setConnecting(true);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", {
        body: { action: "wp_connect_start", domain, wpUrl: target, returnUrl: window.location.href },
      });
      const r = data as { authorizeUrl?: string };
      if (r?.authorizeUrl) window.location.href = r.authorizeUrl;
      else toast.error("Falha ao iniciar conexão.");
    } catch { toast.error("Falha ao iniciar conexão."); setConnecting(false); }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_disconnect", domain } });
      await qc.invalidateQueries({ queryKey: ["wp-status", domain] });
      toast.success("WordPress desconectado.");
    } catch { toast.error("Falha ao desconectar."); }
    finally { setBusy(null); }
  };

  const setStatus = async (plugin: string, status: "active" | "inactive") => {
    setBusy(plugin);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_plugin_set_status", domain, plugin, status } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { toast.error("Falha: " + JSON.stringify(r?.raw).slice(0, 120)); return; }
      await qc.invalidateQueries({ queryKey: ["wp-plugins", domain] });
    } catch { toast.error("Falha ao atualizar plugin."); }
    finally { setBusy(null); }
  };

  const del = async (plugin: string) => {
    setBusy(plugin);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_plugin_delete", domain, plugin } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { toast.error("Falha: " + JSON.stringify(r?.raw).slice(0, 120)); return; }
      toast.success("Plugin excluído.");
      await qc.invalidateQueries({ queryKey: ["wp-plugins", domain] });
    } catch { toast.error("Falha ao excluir plugin."); }
    finally { setBusy(null); }
  };

  const install = async () => {
    const s = slug.trim().toLowerCase();
    if (!s) { toast.error("Informe o slug do plugin (wordpress.org)."); return; }
    setBusy("install");
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "wp_plugin_install", domain, slug: s, activate: true } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { toast.error("Falha: " + JSON.stringify(r?.raw).slice(0, 160)); return; }
      setSlug("");
      toast.success("Plugin instalado e ativado.");
      await qc.invalidateQueries({ queryKey: ["wp-plugins", domain] });
    } catch { toast.error("Falha ao instalar plugin."); }
    finally { setBusy(null); }
  };

  const visiblePlugins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? plugins.filter((p) => (p.name ?? p.plugin).toLowerCase().includes(q)) : plugins;
  }, [plugins, search]);

  if (!connected) {
    return (
      <Card variant="bordered">
        <CardHeader><CardTitle>Gerenciar plugins</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Conecte este WordPress para gerenciar plugins (ativar, desativar, instalar, excluir) direto daqui.
            Você será levado ao seu wp-admin para aprovar com 1 clique — nenhuma senha é digitada aqui.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">URL do WordPress</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="flex-1"
                placeholder={`https://${domain}`}
                value={connectUrl}
                onChange={(e) => setConnectUrl(e.target.value)}
                onBlur={() => connectUrl && setConnectUrl(toHttps(connectUrl))}
              />
              <Button onClick={connect} disabled={connecting} className="shrink-0">
                {connecting ? <Loader2 className="size-4 animate-spin" /> : <><Plug className="size-4 mr-1.5" /> Conectar</>}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O WordPress exige <strong>HTTPS</strong> para conectar (usamos sempre <code>https://</code>). Se a conexão falhar,
            ative o SSL grátis do site no hPanel da Hostinger e tente de novo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Plugins</CardTitle>
        <Button variant="ghost" size="sm" disabled={busy === "disconnect"} onClick={disconnect}>Desconectar</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Instalar por slug */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input className="flex-1" placeholder="Instalar plugin por slug (ex.: classic-editor)" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Button disabled={busy === "install"} onClick={install} className="shrink-0">
            {busy === "install" ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4 mr-1.5" /> Instalar</>}
          </Button>
        </div>

        {/* Busca */}
        {plugins.length > 5 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar plugin..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}

        {/* Lista de plugins */}
        {pluginsError ? (
          <p className="text-sm text-destructive break-words">Erro ao listar plugins: {(pluginsError as Error).message}</p>
        ) : loadingPlugins ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : visiblePlugins.length === 0 ? (
          <p className="text-sm text-muted-foreground">{plugins.length === 0 ? "Nenhum plugin." : "Nenhum resultado."}</p>
        ) : (
          <div className="space-y-2">
            {visiblePlugins.map((p) => {
              const active = p.status === "active";
              return (
                <div key={p.plugin} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.name || p.plugin}
                      <Badge variant={active ? "success" : "outline"} className="ml-2">{active ? "ativo" : "inativo"}</Badge>
                      {p.update_available && (
                        <Badge variant="warning" className="ml-1.5">↑ {p.latest_version} disponível</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.version ? `v${p.version}` : "versão desconhecida"}
                      {p.update_available && p.latest_version ? ` → v${p.latest_version}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.update_available && wpAdminUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={`${wpAdminUrl}/plugins.php`} target="_blank" rel="noreferrer">Atualizar</a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" disabled={busy === p.plugin} onClick={() => setStatus(p.plugin, active ? "inactive" : "active")}>
                      {busy === p.plugin ? <Loader2 className="size-4 animate-spin" /> : active ? "Desativar" : "Ativar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon-sm" disabled={busy === p.plugin}><Trash2 className="size-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir plugin?</AlertDialogTitle>
                          <AlertDialogDescription>{p.name || p.plugin} será removido do site {domain}. Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del(p.plugin)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          A versão e a verificação de atualização vêm do wordpress.org. O WordPress não permite
          <strong> aplicar </strong> a atualização pela API — o botão "Atualizar" abre o wp-admin do site para concluir com 1 clique.
        </p>

        {/* Temas (somente leitura) */}
        {themes.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-sm font-medium">Temas instalados</p>
            <div className="flex flex-wrap gap-2">
              {themes.map((t, i) => {
                const name = typeof t.name === "string" ? t.name : t.name?.rendered;
                return (
                  <Badge key={t.stylesheet ?? i} variant={t.status === "active" ? "success" : "outline"}>
                    {name || t.stylesheet}{t.status === "active" ? " (ativo)" : ""}
                  </Badge>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">A API do WordPress permite apenas listar temas — ativar/excluir não é suportado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/50 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

function InstallForm({ domain, hasInstall, onDone }: { domain: string; hasInstall: boolean; onDone: () => void }) {
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
    <Card variant="bordered">
      <CardHeader><CardTitle>{hasInstall ? "Instalar outra / Reinstalar" : "Instalar WordPress"}</CardTitle></CardHeader>
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
          O site precisa já existir na hospedagem. A instalação é assíncrona — acompanhe em "Visão geral" após ~1-2 min.
        </p>
      </CardContent>
    </Card>
  );
}

/* ─── Subdomínios ─── */
interface Subdomain { subdomain?: string; domain?: string; directory?: string }
function SubdomainsTab({ domain }: { domain: string }) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["subdomains", domain],
    queryFn: async () => {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "subdomains_list", domain } });
      const r = data as { ok: boolean; data: unknown; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 300)); return []; }
      setErr(null);
      const arr = (Array.isArray(r.data) ? r.data : (r.data as { data?: unknown[] })?.data ?? []) as Subdomain[];
      return arr;
    },
  });

  const labelOf = (s: Subdomain) => s.subdomain || s.domain || "";
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? subs.filter((s) => labelOf(s).toLowerCase().includes(q)) : subs;
  }, [subs, search]);

  const create = async () => {
    const sub = novo.trim().toLowerCase().replace(/\.?$/, "");
    if (!sub) { toast.error("Informe o subdomínio."); return; }
    setBusy(true); setErr(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "subdomain_create", domain, subdomain: sub } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 400)); return; }
      setNovo("");
      toast.success("Subdomínio criado.");
      await qc.invalidateQueries({ queryKey: ["subdomains", domain] });
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  };

  const remove = async (sub: string) => {
    setBusy(true); setErr(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "subdomain_delete", domain, subdomain: sub } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 400)); return; }
      toast.success("Subdomínio excluído.");
      await qc.invalidateQueries({ queryKey: ["subdomains", domain] });
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  };

  return (
    <Card variant="bordered" className="mt-4">
      <CardHeader><CardTitle>Subdomínios</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-sm text-destructive break-words">Erro: {err}</p>}

        {/* Criar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center rounded-lg border border-border">
            <Input className="border-0 focus-visible:ring-0" placeholder="blog" value={novo} onChange={(e) => setNovo(e.target.value)} />
            <span className="px-3 text-sm text-muted-foreground">.{domain}</span>
          </div>
          <Button disabled={busy} onClick={create} className="shrink-0">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4 mr-1.5" /> Criar</>}
          </Button>
        </div>

        {/* Busca */}
        {subs.length > 3 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar subdomínio..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}

        {/* Lista */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{subs.length === 0 ? "Nenhum subdomínio." : "Nenhum resultado."}</p>
        ) : (
          <div className="space-y-2">
            {visible.map((s, i) => {
              const label = labelOf(s);
              return (
                <div key={label || i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{label}</p>
                    {s.directory && <p className="text-xs text-muted-foreground truncate">{s.directory}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon-sm" disabled={busy}><Trash2 className="size-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir subdomínio?</AlertDialogTitle>
                        <AlertDialogDescription>O subdomínio {label} será removido. Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(s.subdomain || label)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── DNS (layout estilo Hostinger: busca em cima + tabela) ─── */
function DnsTab({ domain, canEdit, canReset }: { domain: string; canEdit: boolean; canReset: boolean }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<DnsRecord[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

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
  const add = () => {
    const novo: DnsRecord = { uid: uid(), name: "@", type: "A", ttl: 14400, content: "" };
    setRows((prev) => [novo, ...(prev ?? [])]);
  };

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

  // ── Snapshots (histórico) ──
  interface Snapshot { id?: string | number; snapshot_id?: string | number; reason?: string; created_at?: string }
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null);
  const [loadingSnaps, setLoadingSnaps] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const loadSnapshots = async () => {
    setLoadingSnaps(true); setErr(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "dns_snapshots", domain } });
      const r = data as { ok: boolean; data: unknown; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 300)); setSnaps([]); return; }
      const arr = (Array.isArray(r.data) ? r.data : (r.data as { data?: unknown[] })?.data ?? []) as Snapshot[];
      setSnaps(arr);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setLoadingSnaps(false); }
  };

  const restoreSnapshot = async (id: string) => {
    setRestoring(id); setErr(null);
    try {
      const { data } = await invokeEdgeFunction("hostinger-tenant", { body: { action: "dns_snapshot_restore", domain, snapshotId: id } });
      const r = data as { ok: boolean; raw: unknown };
      if (!r?.ok) { setErr(JSON.stringify(r?.raw).slice(0, 400)); return; }
      toast.success("Snapshot restaurado.");
      await qc.invalidateQueries({ queryKey: ["dns", domain] });
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setRestoring(null); }
  };

  const presentTypes = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.type))).sort(),
    [rows],
  );
  const visible = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (typeFilter === "ALL" || r.type === typeFilter) &&
      (!q || r.name.toLowerCase().includes(q) || r.content.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)),
    );
  }, [rows, search, typeFilter]);

  return (
    <Card variant="bordered" className="mt-4">
      <CardHeader className="flex-row items-center justify-between gap-2">
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
            {/* Toolbar: busca + filtro de tipo + adicionar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por nome, tipo ou conteúdo..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  {presentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={add} className="shrink-0"><Plus className="size-4 mr-1.5" /> Adicionar</Button>
              )}
            </div>

            {/* Cabeçalho da tabela */}
            <div className="hidden grid-cols-[7rem_1fr_5.5rem_2.25rem] gap-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Tipo</span><span>Nome / Conteúdo</span><span>TTL</span><span />
            </div>

            {/* Linhas */}
            <div className="space-y-2">
              {visible.map((r) => (
                <div key={r.uid} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[7rem_1fr_5.5rem_2.25rem] sm:items-center">
                  <Select value={r.type} disabled={!canEdit} onValueChange={(v) => update(r.uid, { type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DNS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                    <Input placeholder="Nome (@ p/ raiz)" value={r.name} disabled={!canEdit} onChange={(e) => update(r.uid, { name: e.target.value })} />
                    <Input placeholder="Conteúdo / aponta para" value={r.content} disabled={!canEdit} onChange={(e) => update(r.uid, { content: e.target.value })} />
                  </div>
                  <Input type="number" placeholder="TTL" value={r.ttl} disabled={!canEdit} onChange={(e) => update(r.uid, { ttl: Number(e.target.value) })} />
                  {canEdit ? (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(r.uid)}><Trash2 className="size-4" /></Button>
                  ) : <span />}
                </div>
              ))}
              {visible.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? "Nenhum registro." : "Nenhum registro corresponde à busca."}
                </p>
              )}
            </div>

            {canEdit ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted-foreground">{visible.length} de {rows.length} registros</span>
                <Button size="sm" disabled={saving} onClick={save}>{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar DNS"}</Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Visualização apenas — edição de DNS não liberada para este site.</p>
            )}

            {/* Histórico (snapshots) */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium"><History className="size-4" /> Histórico (snapshots)</span>
                <Button variant="ghost" size="sm" disabled={loadingSnaps} onClick={loadSnapshots}>
                  {loadingSnaps ? <Loader2 className="size-4 animate-spin" /> : snaps === null ? "Carregar" : "Atualizar"}
                </Button>
              </div>
              {snaps !== null && (
                snaps.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Nenhum snapshot disponível.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {snaps.map((s, i) => {
                      const id = String(s.id ?? s.snapshot_id ?? i);
                      return (
                        <div key={id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.reason || `Snapshot ${id}`}</p>
                            {s.created_at && <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>}
                          </div>
                          {canReset && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={restoring === id}>
                                  {restoring === id ? <Loader2 className="size-4 animate-spin" /> : <><RotateCcw className="size-3.5 mr-1.5" /> Restaurar</>}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restaurar este snapshot?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A zona DNS de {domain} será substituída pelo estado deste snapshot. Os registros atuais serão perdidos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => restoreSnapshot(id)}>Restaurar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
