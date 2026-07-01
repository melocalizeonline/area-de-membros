import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useTenantCatalog } from "@/hooks/useTenantCatalog";

export type ExpirationKind = "perpetual" | "date" | "none";

export interface CustomerAccessSummary {
  /** Nomes dos produtos que o cliente possui (via pedidos aprovados/concluídos). */
  products: string[];
  /** Resumo da expiração de acesso do cliente. */
  expiration: { kind: ExpirationKind; date: string | null };
}

interface CustomerRef {
  id: string;
  user_id: string | null;
}

/**
 * Busca em LOTE, para a lista de clientes já carregada, os produtos que cada
 * cliente possui (tabela `orders`) e a expiração do acesso (régua em
 * `course_customers.expires_at`). Evita N+1 fazendo 2 queries com `.in()`.
 *
 * Expiração: `perpetual` se houver ao menos um acesso sem data (perpétuo);
 * senão a MAIOR data (quando o cliente perde todo o acesso); `none` se não
 * houver acesso a curso registrado.
 */
export function useCustomersAccess(customers: CustomerRef[]) {
  const { tenant } = useTenant();
  const tenantId = tenant?.id ?? null;
  const { data: catalog } = useTenantCatalog();

  const customerIds = customers.map((c) => c.id).filter(Boolean);
  const userIds = customers.map((c) => c.user_id).filter(Boolean) as string[];
  // Chave estável (ordenada) para o cache do react-query.
  const idsKey = [...customerIds].sort().join(",");

  const productNameById = new Map(
    (catalog?.products ?? []).map((p) => [p.id, p.name]),
  );

  return useQuery({
    // catalog no key: quando os produtos do catálogo carregam, refaz o mapeamento de nomes.
    queryKey: ["customers-access", tenantId, idsKey, catalog?.products?.length ?? 0],
    enabled: !!tenantId && customerIds.length > 0 && !!catalog,
    staleTime: 10_000,
    queryFn: async (): Promise<Map<string, CustomerAccessSummary>> => {
      const [ordersRes, ccRes] = await Promise.all([
        supabase
          .from("orders")
          .select("customer_id, product_id, status")
          .in("customer_id", customerIds)
          .in("status", ["completed", "approved"]),
        userIds.length
          ? supabase
              .from("course_customers")
              .select("user_id, expires_at")
              .in("user_id", userIds)
          : Promise.resolve({ data: [] as { user_id: string; expires_at: string | null }[] }),
      ]);

      // Produtos por cliente (customer_id → Set de nomes).
      const productsByCustomer = new Map<string, Set<string>>();
      for (const o of (ordersRes.data ?? []) as { customer_id: string; product_id: string }[]) {
        if (!o.customer_id || !o.product_id) continue;
        const name = productNameById.get(o.product_id);
        if (!name) continue;
        if (!productsByCustomer.has(o.customer_id)) productsByCustomer.set(o.customer_id, new Set());
        productsByCustomer.get(o.customer_id)!.add(name);
      }

      // Expiração por user_id.
      const expiresByUser = new Map<string, (string | null)[]>();
      for (const r of (ccRes.data ?? []) as { user_id: string; expires_at: string | null }[]) {
        if (!r.user_id) continue;
        if (!expiresByUser.has(r.user_id)) expiresByUser.set(r.user_id, []);
        expiresByUser.get(r.user_id)!.push(r.expires_at ?? null);
      }

      const summary = new Map<string, CustomerAccessSummary>();
      for (const c of customers) {
        const products = [...(productsByCustomer.get(c.id) ?? [])];
        const list = c.user_id ? expiresByUser.get(c.user_id) ?? [] : [];
        let expiration: CustomerAccessSummary["expiration"];
        if (list.length === 0) {
          expiration = { kind: "none", date: null };
        } else if (list.some((d) => d == null)) {
          expiration = { kind: "perpetual", date: null };
        } else {
          // Todos com data: a maior é quando o cliente perde todo o acesso.
          const max = (list as string[]).reduce((a, b) => (a > b ? a : b));
          expiration = { kind: "date", date: max };
        }
        summary.set(c.id, { products, expiration });
      }
      return summary;
    },
  });
}
