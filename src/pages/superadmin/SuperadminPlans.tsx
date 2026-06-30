import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, CreditCard } from "lucide-react";
import SuperadminLayout from "@/components/superadmin/SuperadminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  useSuperadminPlans, updatePlanConfig,
  type PlatformPlan, type PlanFeatures, type PlanLimits,
} from "@/hooks/superadmin/useSuperadminPlans";
import { translateEdgeError } from "@/lib/edge-function-utils";
import { toast } from "sonner";

/* ── Schemas ───────────────────────────────────────────────── */

const FEATURE_KEYS: { key: keyof PlanFeatures; label: string }[] = [
  { key: "ai_captions", label: "Legendas por IA" },
  { key: "caption_display", label: "Exibição de legendas" },
  { key: "video_protection", label: "Proteção de vídeo" },
  { key: "video_progress_tracking", label: "Tracking de progresso" },
  { key: "manual_enrollment", label: "Matrícula manual" },
  { key: "hosting", label: "Hospedagem" },
];

const INTEGRATION_KEYS = ["openai", "anthropic", "hotmart", "nory", "vimeo", "pandavideo", "wistia"];

const LIMIT_KEYS: { key: keyof PlanLimits; label: string }[] = [
  { key: "team_members", label: "Membros da equipe" },
  { key: "customers", label: "Clientes" },
  { key: "storage_gb", label: "Armazenamento (GB)" },
  { key: "courses", label: "Cursos" },
];

function formatPrice(cents: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

/* ── Page ──────────────────────────────────────────────────── */

export default function SuperadminPlans() {
  const { data: plans, isLoading } = useSuperadminPlans();
  const [editing, setEditing] = useState<PlatformPlan | null>(null);

  return (
    <SuperadminLayout>
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="mx-auto flex min-w-0 max-w-[1100px] flex-col gap-6">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground md:text-2xl">Planos da plataforma</h1>
          </div>
          <p className="-mt-3 text-sm text-muted-foreground">
            Configure preço, recursos e limites de cada plano. Tenants resolvem os recursos a partir desta configuração.
          </p>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
          ) : !plans || plans.length === 0 ? (
            <Card variant="bordered">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum plano configurado.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} onEdit={() => setEditing(plan)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && <PlanEditor plan={editing} onClose={() => setEditing(null)} />}
    </SuperadminLayout>
  );
}

function PlanCard({ plan, onEdit }: { plan: PlatformPlan; onEdit: () => void }) {
  const activeFeatures = FEATURE_KEYS.filter((f) => plan.features?.[f.key]).length;
  const activeIntegrations = INTEGRATION_KEYS.filter((k) => plan.features?.integrations?.[k]).length;

  return (
    <Card variant="bordered" className={plan.is_active ? "" : "opacity-60"}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
              <Badge variant="outline" className="uppercase text-[10px]">{plan.key}</Badge>
            </div>
            <p className="mt-0.5 text-2xl font-semibold text-foreground">{formatPrice(plan.price_cents, plan.currency)}</p>
            <p className="text-xs text-muted-foreground">/mês</p>
          </div>
          <Badge variant={plan.is_active ? "green" : "gray"}>{plan.is_active ? "Ativo" : "Inativo"}</Badge>
        </div>
        {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
        <Separator />
        <dl className="grid gap-1.5 text-xs">
          <Row label="Recursos ativos" value={`${activeFeatures}/${FEATURE_KEYS.length}`} />
          <Row label="Integrações" value={`${activeIntegrations}/${INTEGRATION_KEYS.length}`} />
          <Row label="Equipe" value={limitLabel(plan.limits?.team_members)} />
          <Row label="Clientes" value={limitLabel(plan.limits?.customers)} />
          <Row label="Cursos" value={limitLabel(plan.limits?.courses)} />
        </dl>
        <Button variant="outline" size="sm" className="mt-1 gap-1.5" onClick={onEdit}>
          <Pencil className="size-3.5" /> Editar
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Editor ────────────────────────────────────────────────── */

function PlanEditor({ plan, onClose }: { plan: PlatformPlan; onClose: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [priceReais, setPriceReais] = useState((plan.price_cents / 100).toFixed(2));
  const [isActive, setIsActive] = useState(plan.is_active);
  const [features, setFeatures] = useState<PlanFeatures>({ ...plan.features });
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({ ...(plan.features?.integrations ?? {}) });
  const [limits, setLimits] = useState<PlanLimits>({ ...plan.limits });

  const toggleFeature = (key: keyof PlanFeatures, v: boolean) => setFeatures((f) => ({ ...f, [key]: v }));
  const toggleIntegration = (key: string, v: boolean) => setIntegrations((i) => ({ ...i, [key]: v }));
  const setLimit = (key: keyof PlanLimits, v: string) =>
    setLimits((l) => ({ ...l, [key]: v === "" ? undefined : Number(v) }));

  const save = async () => {
    const cents = Math.round(Number(priceReais.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error("Preço inválido.");
      return;
    }
    setBusy(true);
    try {
      await updatePlanConfig(plan.key, {
        name: name.trim(),
        description: description.trim(),
        price_cents: cents,
        is_active: isActive,
        features: { ...features, integrations },
        limits,
      });
      toast.success("Plano atualizado.");
      qc.invalidateQueries({ queryKey: ["superadmin_plans_config"] });
      qc.invalidateQueries({ queryKey: ["platform_plans"] });
      onClose();
    } catch (err) {
      toast.error(translateEdgeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar plano · {plan.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Básico */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="p-name">Nome</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="p-desc">Descrição</Label>
              <Textarea id="p-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-price">Preço mensal (R$)</Label>
              <Input id="p-price" inputMode="decimal" value={priceReais} onChange={(e) => setPriceReais(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 sm:mt-6">
              <Label htmlFor="p-active" className="cursor-pointer">Plano ativo</Label>
              <Switch id="p-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <Separator />

          {/* Recursos */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Recursos</h4>
            <div className="flex flex-col divide-y divide-border">
              {FEATURE_KEYS.map((f) => (
                <ToggleRow
                  key={String(f.key)}
                  label={f.label}
                  checked={!!features[f.key]}
                  onChange={(v) => toggleFeature(f.key, v)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Integrações */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Integrações</h4>
            <div className="grid grid-cols-2 gap-x-6">
              {INTEGRATION_KEYS.map((k) => (
                <ToggleRow
                  key={k}
                  label={k}
                  capitalize
                  checked={!!integrations[k]}
                  onChange={(v) => toggleIntegration(k, v)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Limites */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Limites</h4>
            <p className="mb-3 text-xs text-muted-foreground">Use -1 para ilimitado, vazio para não definido.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {LIMIT_KEYS.map((l) => (
                <div key={String(l.key)} className="flex flex-col gap-1.5">
                  <Label htmlFor={`lim-${String(l.key)}`}>{l.label}</Label>
                  <Input
                    id={`lim-${String(l.key)}`}
                    type="number"
                    value={limits[l.key] === undefined ? "" : String(limits[l.key])}
                    onChange={(e) => setLimit(l.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={save} disabled={busy || !name.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Small components ──────────────────────────────────────── */

function ToggleRow({
  label, checked, onChange, capitalize,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={`text-sm text-foreground ${capitalize ? "capitalize" : ""}`}>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function limitLabel(v: number | undefined): string {
  if (v === undefined || v === null) return "—";
  if (v === -1) return "Ilimitado";
  return new Intl.NumberFormat("pt-BR").format(v);
}
