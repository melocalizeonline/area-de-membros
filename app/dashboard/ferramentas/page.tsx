import { Wrench } from "lucide-react";
import { ContentCard } from "@/components/content-card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function ToolsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: access } = await supabase
    .from("member_products")
    .select("product_id")
    .eq("member_id", user?.id ?? "")
    .eq("active", true);

  const productIds = (access ?? []).map((item) => item.product_id);
  const { data: tools } = productIds.length
    ? await supabase
        .from("tools")
        .select("id, name, slug, description, tool_type, external_url")
        .eq("published", true)
        .in("product_id", productIds)
        .order("sort_order")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Ferramentas</h1>
        <p className="mt-1 text-sm text-gray-600">Recursos praticos liberados para seu produto.</p>
      </div>

      {(tools ?? []).length === 0 ? (
        <EmptyState
          description="Calculadoras, geradores, planilhas e links externos liberados por produto aparecem aqui."
          icon={Wrench}
          title="Nenhuma ferramenta liberada ainda"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(tools ?? []).map((tool, index) => {
            const href =
              tool.tool_type === "external" && tool.external_url
                ? tool.external_url
                : `/dashboard/ferramentas/${tool.slug}`;

            return (
              <ContentCard
                description={tool.description ?? "Ferramenta disponivel para sua conta."}
                external={tool.tool_type === "external"}
                href={href}
                icon={index === 0 ? "Sparkles" : index === 1 ? "ClipboardCheck" : "Wrench"}
                index={index + 1}
                key={tool.id}
                label={tool.tool_type === "external" ? "Link externo" : "Ferramenta"}
                title={tool.name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
