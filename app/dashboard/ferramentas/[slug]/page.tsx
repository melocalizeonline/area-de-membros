import { notFound } from "next/navigation";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ToolDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tool } = await supabase
    .from("tools")
    .select("name, description, published")
    .eq("slug", slug)
    .single();

  if (!tool?.published) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">{tool.name}</h1>
        <p className="mt-1 text-sm text-gray-600">{tool.description}</p>
      </div>

      <Card>
        <CardTitle>Ferramenta interna</CardTitle>
        <CardText>
          Este espaco esta pronto para receber calculadoras, geradores e recursos sob medida.
        </CardText>
      </Card>
    </div>
  );
}
