import Link from "next/link";
import { ExternalLink, Wrench } from "lucide-react";
import { Card, CardText, CardTitle } from "@/components/ui/card";
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
          {(tools ?? []).map((tool) => {
            const href =
              tool.tool_type === "external" && tool.external_url
                ? tool.external_url
                : `/dashboard/ferramentas/${tool.slug}`;

            return (
              <Link href={href} key={tool.id} target={tool.tool_type === "external" ? "_blank" : undefined}>
                <Card className="group h-full transition hover:-translate-y-0.5 hover:border-teal-500">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{tool.name}</CardTitle>
                      <CardText>{tool.description ?? "Ferramenta disponivel para sua conta."}</CardText>
                    </div>
                    {tool.tool_type === "external" && (
                      <ExternalLink className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-teal-700" />
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
