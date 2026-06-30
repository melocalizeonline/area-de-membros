import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ExternalLink, Building2, Users, Package, BookOpen, ShoppingCart,
  DollarSign, Pencil, MoreHorizontal, ShieldCheck, ShieldX, PauseCircle, PlayCircle,
  Mail, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SuperadminLayout from "@/components/superadmin/SuperadminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useSuperadminTenantDetail, useSuperadminAuditLogs, tenantAdminAction,
  type AccountStatus, type TenantDetailMember,
} from "@/hooks/superadmin/useSuperadminTenantDetail";
import { translateEdgeError } from "@/lib/edge-function-utils";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import i18n from "@/i18n";

/* ── Maps ──────────────────────────────────────────────────── */

const STATUS_BADGE: Record<AccountStatus, { variant: BadgeVariant; label: string }> = {
  active: { variant: "green", label: "Ativo" },
  paused: { variant: "amber", label: "Pausado" },
  blocked: { variant: "red", label: "Bloqueado" },
  cancelled: { variant: "gray", label: "Cancelado" },
};

const MEMBER_STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  active: { variant: "green", label: "Ativo" },
  paused: { variant: "amber", label: "Pausado" },
  pending: { variant: "blue", label: "Pendente" },
};

const ROLE_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  owner: { variant: "purple", label: "Owner" },
  editor: { variant: "blue", label: "Editor" },
  member: { variant: "gray", label: "Membro" },
};

function formatCurrency(cents: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

/* ── Page ──────────────────────────────────────────────────── */

export default function SuperadminTenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lang = i18n.language;

  const { data, isLoading, error } = useSuperadminTenantDetail(tenantId);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["superadmin_tenant_detail", tenantId] });
    qc.invalidateQueries({ queryKey: ["superadmin_audit_logs", tenantId] });
  };

  /** Executa uma acao de mutacao com feedback padrao. */
  const run = async (body: Record<string, unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await tenantAdminAction({ ...body, tenant_id: tenantId });
      toast.success(successMsg);
      refresh();
      return true;
    } catch (err) {
      toast.error(translateEdgeError(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <SuperadminLayout>
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="mx-auto flex min-w-0 max-w-[1200px] flex-col gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/superadmin/tenants")}
            className="-ml-2 w-fit gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar para tenants
          </Button>

          {isLoading ? (
            <DetailSkeleton />
          ) : error || !data ? (
            <Card variant="bordered">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {error ? translateEdgeError(error) : "Tenant não encontrado."}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-5 text-muted-foreground" />
                    <h1 className="truncate text-xl font-semibold text-foreground md:text-2xl">
                      {data.tenant.name}
                    </h1>
                  </div>
                  <a
                    href={`/${data.tenant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    /{data.tenant.slug}
                    <ExternalLink className="size-3 opacity-60" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_BADGE[data.account_status].variant}>
                    {STATUS_BADGE[data.account_status].label}
                  </Badge>
                  <Badge variant="outline" className="uppercase">{data.plan}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/${data.tenant.slug}`)}
                    className="gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    Portal
                  </Button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <MetricCard icon={Users} label="Clientes" value={String(data.metrics.customers)} />
                <MetricCard icon={Package} label="Produtos" value={String(data.metrics.products)} />
                <MetricCard icon={BookOpen} label="Cursos" value={String(data.metrics.courses)} />
                <MetricCard icon={ShoppingCart} label="Pedidos" value={String(data.metrics.orders)} />
                <MetricCard icon={DollarSign} label="Receita" value={formatCurrency(data.metrics.revenue)} />
              </div>

              <Tabs defaultValue="overview">
                <TabsList variant="line">
                  <TabsTrigger value="overview">Visão geral</TabsTrigger>
                  <TabsTrigger value="members">Membros ({data.members.length})</TabsTrigger>
                  <TabsTrigger value="activity">Atividade</TabsTrigger>
                  <TabsTrigger value="audit">Auditoria</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <OverviewTab data={data} busy={busy} run={run} lang={lang} />
                </TabsContent>
                <TabsContent value="members" className="mt-6">
                  <MembersTab members={data.members} busy={busy} run={run} lang={lang} />
                </TabsContent>
                <TabsContent value="activity" className="mt-6">
                  <ActivityTab data={data} lang={lang} />
                </TabsContent>
                <TabsContent value="audit" className="mt-6">
                  <AuditTab tenantId={tenantId} lang={lang} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </SuperadminLayout>
  );
}

/* ── Overview ──────────────────────────────────────────────── */

type RunFn = (body: Record<string, unknown>, successMsg: string) => Promise<boolean>;

function OverviewTab({
  data, busy, run, lang,
}: {
  data: NonNullable<ReturnType<typeof useSuperadminTenantDetail>["data"]>;
  busy: boolean; run: RunFn; lang: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BasicDetailsCard data={data} busy={busy} run={run} lang={lang} />
      <div className="flex flex-col gap-6">
        <PlanCard plan={data.plan} busy={busy} run={run} />
        <StatusCard
          status={data.account_status}
          reason={data.account_status_reason}
          updatedAt={data.account_status_updated_at}
          busy={busy}
          run={run}
          lang={lang}
        />
      </div>
    </div>
  );
}

function BasicDetailsCard({
  data, busy, run, lang,
}: {
  data: NonNullable<ReturnType<typeof useSuperadminTenantDetail>["data"]>;
  busy: boolean; run: RunFn; lang: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(data.tenant.name);
  const [slug, setSlug] = useState(data.tenant.slug);

  const save = async () => {
    const ok = await run(
      { action: "update_tenant", name: name.trim(), slug: slug.trim().toLowerCase() },
      "Dados atualizados.",
    );
    if (ok) setOpen(false);
  };

  return (
    <Card variant="bordered">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Dados do tenant</h3>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Pencil className="size-3.5" /> Editar
          </Button>
        </div>
        <dl className="grid gap-3 text-sm">
          <Field label="Nome" value={data.tenant.name} />
          <Field label="Slug" value={`/${data.tenant.slug}`} />
          <Field label="Public ID" value={data.tenant.public_id ?? "—"} mono />
          <Field label="Criado em" value={formatDateTime(data.tenant.created_at, lang)} />
          <Field label="Owner" value={data.owner?.name || data.owner?.email || "—"} />
          {data.owner?.email && data.owner.email !== data.owner.name && (
            <Field label="Email do owner" value={data.owner.email} />
          )}
        </dl>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar dados do tenant</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-name">Nome</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-slug">Slug</Label>
              <Input
                id="t-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="meu-tenant"
              />
              <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={save} disabled={busy || !name.trim() || !slug.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PlanCard({ plan, busy, run }: { plan: string; busy: boolean; run: RunFn }) {
  const [selected, setSelected] = useState(plan);
  const { data: plans } = useQuery({
    queryKey: ["platform_plans"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("key, name, is_active")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const changed = selected !== plan;
  const apply = () => run({ action: "update_plan", plan: selected }, "Plano atualizado.");

  return (
    <Card variant="bordered">
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Plano</h3>
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(plans ?? [{ key: plan, name: plan, is_active: true }]).map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.name}{!p.is_active ? " (inativo)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ConfirmButton
            disabled={!changed || busy}
            label="Aplicar"
            title="Trocar plano do tenant"
            description={`O plano será alterado para "${selected}". Recursos por plano passam a refletir a nova configuração.`}
            onConfirm={apply}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({
  status, reason, updatedAt, busy, run, lang,
}: {
  status: AccountStatus; reason: string | null; updatedAt: string | null;
  busy: boolean; run: RunFn; lang: string;
}) {
  const [selected, setSelected] = useState<AccountStatus>(status);
  const [reasonInput, setReasonInput] = useState(reason ?? "");
  const changed = selected !== status || (reasonInput.trim() || null) !== (reason ?? null);
  const destructive = selected === "blocked" || selected === "cancelled";

  const apply = () =>
    run(
      { action: "update_status", account_status: selected, reason: reasonInput.trim() || null },
      "Status atualizado.",
    );

  return (
    <Card variant="bordered">
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Status da conta</h3>
        <div className="flex flex-col gap-3">
          <Select value={selected} onValueChange={(v) => setSelected(v as AccountStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="Motivo (opcional) — visível na trilha de auditoria"
            rows={2}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {updatedAt ? `Alterado em ${formatDateTime(updatedAt, lang)}` : "Sem alterações registradas"}
            </p>
            <ConfirmButton
              disabled={!changed || busy}
              label="Aplicar"
              variant={destructive ? "destructive" : "default"}
              title="Alterar status da conta"
              description={
                destructive
                  ? `O acesso do tenant será restringido (${STATUS_BADGE[selected].label}). Confirme a ação.`
                  : `O status passará para "${STATUS_BADGE[selected].label}".`
              }
              onConfirm={apply}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Members ───────────────────────────────────────────────── */

function MembersTab({
  members, busy, run, lang,
}: {
  members: TenantDetailMember[]; busy: boolean; run: RunFn; lang: string;
}) {
  if (members.length === 0) {
    return <EmptyCard text="Nenhum membro." />;
  }
  return (
    <Card variant="bordered" className="overflow-hidden">
      <div className="overflow-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <Th>Membro</Th>
              <Th>Papel</Th>
              <Th>Status</Th>
              <Th>Último acesso</Th>
              <Th className="text-right">Ações</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.user_id} className="border-border">
                <Td>
                  <p className="font-medium text-foreground">{m.name || m.email || m.user_id}</p>
                  {m.email && m.email !== m.name && (
                    <p className="text-xs text-muted-foreground">
                      {m.email}
                      {!m.email_confirmed && <span className="ml-1 text-amber-600">· não confirmado</span>}
                    </p>
                  )}
                </Td>
                <Td>
                  <Badge variant={ROLE_BADGE[m.role]?.variant ?? "gray"}>
                    {ROLE_BADGE[m.role]?.label ?? m.role}
                  </Badge>
                </Td>
                <Td>
                  <Badge variant={MEMBER_STATUS_BADGE[m.status]?.variant ?? "gray"}>
                    {MEMBER_STATUS_BADGE[m.status]?.label ?? m.status}
                  </Badge>
                </Td>
                <Td>
                  <span className="text-xs text-muted-foreground">
                    {m.last_sign_in_at ? formatDateTime(m.last_sign_in_at, lang) : "—"}
                  </span>
                </Td>
                <Td className="text-right">
                  <MemberActions member={m} busy={busy} run={run} />
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function MemberActions({
  member, busy, run,
}: {
  member: TenantDetailMember; busy: boolean; run: RunFn;
}) {
  const [confirm, setConfirm] = useState<null | { title: string; description: string; onConfirm: () => void }>(null);
  const isPaused = member.status === "paused";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={busy} className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {member.role !== "owner" && (
            <DropdownMenuItem
              onClick={() => run({ action: "update_member_role", user_id: member.user_id, role: "owner" }, "Papel atualizado.")}
            >
              <ShieldCheck className="size-4" /> Tornar owner
            </DropdownMenuItem>
          )}
          {member.role !== "editor" && (
            <DropdownMenuItem
              onClick={() => run({ action: "update_member_role", user_id: member.user_id, role: "editor" }, "Papel atualizado.")}
            >
              <ShieldX className="size-4" /> Tornar editor
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isPaused ? (
            <DropdownMenuItem
              onClick={() => run({ action: "update_member_status", user_id: member.user_id, status: "active" }, "Membro reativado.")}
            >
              <PlayCircle className="size-4" /> Reativar acesso
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                setConfirm({
                  title: "Pausar membro",
                  description: "O membro perderá acesso ao painel do tenant até ser reativado.",
                  onConfirm: () => run({ action: "update_member_status", user_id: member.user_id, status: "paused" }, "Membro pausado."),
                })
              }
            >
              <PauseCircle className="size-4" /> Pausar acesso
            </DropdownMenuItem>
          )}
          {member.status === "pending" && (
            <DropdownMenuItem
              onClick={() => run({ action: "resend_member_invite", user_id: member.user_id, origin: window.location.origin }, "Convite reenviado.")}
            >
              <Mail className="size-4" /> Reenviar convite
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm?.onConfirm();
                setConfirm(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Activity ──────────────────────────────────────────────── */

function ActivityTab({
  data, lang,
}: {
  data: NonNullable<ReturnType<typeof useSuperadminTenantDetail>["data"]>; lang: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card variant="bordered" className="overflow-hidden">
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Integrações</h3>
          {data.integrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma integração conectada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.integrations.map((i) => (
                <Badge key={i.provider} variant={i.status === "active" ? "green" : "gray"} className="gap-1">
                  <span className="capitalize">{i.provider}</span>
                  <span className="opacity-60">· {i.status}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="bordered" className="overflow-hidden">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Pedidos recentes</h3>
            {data.recent_orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem pedidos.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.recent_orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{o.customers?.name || o.customers?.email || "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at, lang)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-medium">{formatCurrency(o.unit_amount)}</span>
                      <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card variant="bordered" className="overflow-hidden">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Clientes recentes</h3>
            {data.recent_customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem clientes.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.recent_customers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{c.name || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(c.created_at, lang)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Audit ─────────────────────────────────────────────────── */

function AuditTab({ tenantId, lang }: { tenantId: string | undefined; lang: string }) {
  const { data: logs, isLoading } = useSuperadminAuditLogs(tenantId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!logs || logs.length === 0) return <EmptyCard text="Nenhuma ação registrada." />;

  return (
    <Card variant="bordered" className="overflow-hidden">
      <div className="overflow-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <Th>Quando</Th>
              <Th>Ação</Th>
              <Th>Alvo</Th>
              <Th>Mudança</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-border align-top">
                <Td className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(log.created_at, lang)}
                </Td>
                <Td><Badge variant="outline" className="text-[10px]">{log.action}</Badge></Td>
                <Td className="text-xs text-muted-foreground">{log.target_type}</Td>
                <Td className="text-xs">
                  <AuditDiff before={log.before_data} after={log.after_data} />
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function AuditDiff({
  before, after,
}: {
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
}) {
  if (!after) return <span className="text-muted-foreground">—</span>;
  const keys = Object.keys(after);
  return (
    <div className="flex flex-col gap-0.5">
      {keys.map((k) => {
        const b = before?.[k];
        const a = after[k];
        if (JSON.stringify(b) === JSON.stringify(a)) return null;
        return (
          <span key={k} className="font-mono text-[11px]">
            <span className="text-muted-foreground">{k}: </span>
            {b !== undefined && b !== null && (
              <span className="text-red-600 line-through">{String(b)}</span>
            )}
            {b !== undefined && b !== null && " → "}
            <span className="text-green-600">{String(a ?? "—")}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ── Small components ──────────────────────────────────────── */

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card variant="bordered">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" /> {label}
        </div>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function ConfirmButton({
  label, title, description, onConfirm, disabled, variant = "default",
}: {
  label: string; title: string; description: string; onConfirm: () => void;
  disabled?: boolean; variant?: "default" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant === "destructive" ? "destructive" : "default"} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <TableHead className={`h-10 bg-card px-3 text-xs font-semibold text-muted-foreground ${className}`}>
      {children}
    </TableHead>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <TableCell className={`px-3 py-3 ${className}`}>{children}</TableCell>;
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card variant="bordered">
      <CardContent className="py-12 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
