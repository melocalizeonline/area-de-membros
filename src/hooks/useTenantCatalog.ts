import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface CatalogProduct { id: string; name: string }
export interface CatalogCourse { id: string; title: string }

/** Produtos e cursos do tenant atual, para seletores de matrícula manual. */
export function useTenantCatalog() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  return useQuery({
    queryKey: ["tenant-catalog", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [{ data: products }, { data: courses }] = await Promise.all([
        supabase.from("products").select("id, name").eq("tenant_id", tenantId!).order("name"),
        supabase.from("courses").select("id, title").eq("tenant_id", tenantId!).order("title"),
      ]);
      return {
        products: (products ?? []) as CatalogProduct[],
        courses: (courses ?? []) as CatalogCourse[],
      };
    },
  });
}
