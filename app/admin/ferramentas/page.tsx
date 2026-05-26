import { createTool } from "@/app/actions/admin";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

export default async function ToolsAdminPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: tools }] = await Promise.all([
    supabase.from("products").select("id, name").eq("status", "active").order("name"),
    supabase.from("tools").select("id, name, slug, description, tool_type, published").order("sort_order")
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Ferramentas</h1>
        <p className="mt-1 text-sm text-gray-600">Crie ferramentas internas ou links externos liberados por produto.</p>
      </div>

      <Card>
        <CardTitle>Nova ferramenta</CardTitle>
        <CardText>Ferramentas internas abrem uma pagina preparada; externas levam para uma URL.</CardText>
        <form action={createTool} className="mt-5 grid gap-4 md:grid-cols-2">
          <FormField label="Produto">
            <Select name="product_id" required>
              <option value="">Selecione</option>
              {(products ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Tipo">
            <Select name="tool_type">
              <option value="internal">Interna</option>
              <option value="external">Link externo</option>
            </Select>
          </FormField>
          <FormField label="Nome">
            <Input name="name" required />
          </FormField>
          <FormField label="Slug">
            <Input name="slug" required />
          </FormField>
          <FormField label="URL externa">
            <Input name="external_url" placeholder="https://..." />
          </FormField>
          <FormField label="Ordem">
            <Input defaultValue="1" name="sort_order" type="number" />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Descricao">
              <Textarea name="description" />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input defaultChecked name="published" type="checkbox" />
            Publicada
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Criar ferramenta</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(tools ?? []).map((tool) => (
          <Card key={tool.id}>
            <CardTitle>{tool.name}</CardTitle>
            <CardText>{tool.description ?? tool.slug}</CardText>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{tool.tool_type}</span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                {tool.published ? "Publicado" : "Rascunho"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
