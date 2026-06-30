import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Clock, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSubscription } from "@/hooks/useSubscription";
import { invokeEdgeFunction, translateEdgeError } from "@/lib/edge-function-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlanRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  plan_type: "free" | "trial" | "paid" | string;
  trial_days: number;
}

function formatPrice(cents: number, currency = "BRL"): string {
  if (cents === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

export default function AdminSelectPlan() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { tenant } = useTenant();
  const { trialExpired } = useSubscription();
  const [selecting, setSelecting] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["select-plan-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("id, key, name, description, price_cents, currency, plan_type, trial_days")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
  });

  const choose = async (plan: PlanRow) => {
    if (plan.plan_type === "paid") return;
    if (!tenant?.id) {
      toast.error("Workspace não encontrado.");
      return;
    }
    setSelecting(plan.key);
    try {
      await invokeEdgeFunction("select-plan", { body: { tenant_id: tenant.id, plan_key: plan.key } });
      await qc.invalidateQueries({ queryKey: ["subscription", tenant.id] });
      await qc.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Plano selecionado!");
      navigate("/admin", { replace: true });
    } catch (err) {
      toast.error(translateEdgeError(err));
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
            Escolha seu plano
          </h1>
          <p className="mt-2 text-muted-foreground">
            Selecione um plano para começar a usar sua área de membros.
          </p>
          {trialExpired && (
            <div className="mx-auto mt-4 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              Seu período de teste expirou. Escolha um plano para continuar.
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
          </div>
        ) : !plans || plans.length === 0 ? (
          <Card variant="bordered">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum plano disponível no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanOption
                key={plan.id}
                plan={plan}
                busy={selecting === plan.key}
                anyBusy={selecting !== null}
                onChoose={() => choose(plan)}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Precisa de ajuda para escolher? Fale com o suporte.
        </p>
      </div>
    </div>
  );
}

function PlanOption({
  plan, busy, anyBusy, onChoose,
}: {
  plan: PlanRow; busy: boolean; anyBusy: boolean; onChoose: () => void;
}) {
  const isPaid = plan.plan_type === "paid";
  const isTrial = plan.plan_type === "trial";

  return (
    <Card
      variant="bordered"
      className={cn(
        "relative flex flex-col",
        isTrial && "border-primary/40 ring-1 ring-primary/20",
        isPaid && "opacity-75",
      )}
    >
      {isTrial && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
          <Sparkles className="size-3" /> Recomendado
        </span>
      )}
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            {isPaid && <Badge variant="gray" className="gap-1 text-[10px]"><Lock className="size-3" /> Em breve</Badge>}
          </div>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatPrice(plan.price_cents, plan.currency)}</p>
          {plan.price_cents > 0 && <p className="text-xs text-muted-foreground">/mês</p>}
          {isTrial && plan.trial_days > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
              <Clock className="size-3.5" /> {plan.trial_days} dias grátis
            </p>
          )}
        </div>

        {plan.description && <p className="flex-1 text-sm text-muted-foreground">{plan.description}</p>}

        {isPaid ? (
          <Button variant="outline" className="w-full" disabled>
            Falar com o suporte
          </Button>
        ) : (
          <Button className="w-full gap-1.5" disabled={anyBusy} onClick={onChoose}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {isTrial ? "Começar teste" : "Selecionar"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
