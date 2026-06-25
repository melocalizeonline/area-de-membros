import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCatalog } from "@/hooks/useTenantCatalog";
import { enrollCustomer } from "@/lib/enroll";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";

interface Props {
  customerId: string;
  userId: string | null;
  email: string;
}

const sortedEq = (a: string[], b: string[]) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function CustomerAccessSection({ customerId, userId }: Props) {
  const { tenant } = useTenant();
  const allow = tenant?.allow_manual_enrollment;
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  const { data: catalog } = useTenantCatalog();

  const [selProducts, setSelProducts] = useState<string[]>([]);
  const [selCourses, setSelCourses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: access } = useQuery({
    queryKey: ["customer-access", customerId],
    enabled: !!allow && !!customerId,
    queryFn: async () => {
      const [ordersRes, ccRes] = await Promise.all([
        supabase
          .from("orders")
          .select("product_id, status")
          .eq("customer_id", customerId)
          .in("status", ["completed", "approved"]),
        userId
          ? supabase.from("course_customers").select("course_id").eq("user_id", userId)
          : Promise.resolve({ data: [] as { course_id: string }[] }),
      ]);
      const productIds = [
        ...new Set(((ordersRes.data ?? []) as { product_id: string }[]).map((o) => o.product_id).filter(Boolean)),
      ];
      const courseIds = ((ccRes.data ?? []) as { course_id: string }[]).map((c) => c.course_id);
      return { productIds, courseIds };
    },
  });

  useEffect(() => {
    if (access) {
      setSelProducts(access.productIds);
      setSelCourses(access.courseIds);
    }
  }, [access]);

  if (!allow) return null;

  const dirty =
    !!access &&
    (!sortedEq(selProducts, access.productIds) || !sortedEq(selCourses, access.courseIds));

  const save = async () => {
    if (!tenantId || !access) return;
    setSaving(true);
    try {
      const gP = selProducts.filter((id) => !access.productIds.includes(id));
      const rP = access.productIds.filter((id) => !selProducts.includes(id));
      const gC = selCourses.filter((id) => !access.courseIds.includes(id));
      const rC = access.courseIds.filter((id) => !selCourses.includes(id));
      if (gP.length || gC.length)
        await enrollCustomer({ tenantId, customerId, productIds: gP, courseIds: gC, action: "grant" });
      if (rP.length || rC.length)
        await enrollCustomer({ tenantId, customerId, productIds: rP, courseIds: rC, action: "revoke" });
      await queryClient.invalidateQueries({ queryKey: ["customer-access", customerId] });
      toast.success("Acessos atualizados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar acessos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="bordered" className="mt-6">
      <CardHeader>
        <CardTitle>Acessos (matrícula manual)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1.5">Produtos</p>
          <MultiSelect
            options={(catalog?.products ?? []).map((p) => ({ value: p.id, label: p.name }))}
            value={selProducts}
            onValueChange={setSelProducts}
            placeholder="Selecione produtos"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-1.5">Cursos</p>
          <MultiSelect
            options={(catalog?.courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
            value={selCourses}
            onValueChange={setSelCourses}
            placeholder="Selecione cursos"
          />
        </div>
        {!userId && selCourses.length > 0 && (
          <p className="text-xs text-amber-600">
            O acesso direto a cursos só é aplicado após o aluno aceitar o convite e criar a conta.
          </p>
        )}
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? "Salvando..." : "Salvar acessos"}
        </Button>
      </CardContent>
    </Card>
  );
}
