import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsAdminPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, description, status, external_product_id")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Produtos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Produtos representam o acesso vendido na Kiwify, Eduzz ou manualmente.
        </p>
      </div>

      <div className="grid gap-4">
        {(products ?? []).map((product) => (
          <Card key={product.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{product.name}</CardTitle>
                <CardText>{product.description ?? product.slug}</CardText>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                {product.status}
              </span>
            </div>
          </Card>
        ))}
        {(products ?? []).length === 0 && (
          <Card>
            <CardTitle>Nenhum produto cadastrado</CardTitle>
            <CardText>Depois vamos adicionar formularios para criar produtos pelo admin.</CardText>
          </Card>
        )}
      </div>
    </div>
  );
}
