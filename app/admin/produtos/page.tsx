import { createProduct } from "@/app/actions/admin";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

      <Card>
        <CardTitle>Novo produto</CardTitle>
        <CardText>O produto controla quais cursos e ferramentas serao liberados.</CardText>
        <form action={createProduct} className="mt-5 grid gap-4 md:grid-cols-2">
          <FormField label="Nome">
            <Input name="name" placeholder="Curso Premium" required />
          </FormField>
          <FormField label="Slug">
            <Input name="slug" placeholder="curso-premium" required />
          </FormField>
          <FormField label="ID externo opcional">
            <Input name="external_product_id" placeholder="ID na Kiwify ou Eduzz" />
          </FormField>
          <label className="flex items-center gap-2 self-end text-sm text-gray-700">
            <input defaultChecked name="active" type="checkbox" />
            Produto ativo
          </label>
          <FormField label="Descricao">
            <Textarea name="description" placeholder="Descreva o acesso vendido." />
          </FormField>
          <div className="md:col-span-2">
            <Button type="submit">Criar produto</Button>
          </div>
        </form>
      </Card>

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
