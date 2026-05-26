import { createIntegrationMapping } from "@/app/actions/admin";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";

const integrations = [
  {
    name: "Kiwify",
    status: "Webhook preparado",
    endpoint: "/api/webhooks/kiwify"
  },
  {
    name: "Eduzz",
    status: "Webhook preparado",
    endpoint: "/api/webhooks/eduzz"
  },
  {
    name: "Videos",
    status: "YouTube, Vimeo, Panda e embed planejados",
    endpoint: "Configurado por aula"
  }
];

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: mappings }] = await Promise.all([
    supabase.from("products").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("integration_mappings")
      .select("id, provider, external_product_id, active, products(name)")
      .order("created_at", { ascending: false })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Integracoes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Central para conectar vendas, liberacoes e provedores de video.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardTitle>{integration.name}</CardTitle>
            <CardText>{integration.status}</CardText>
            <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {integration.endpoint}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Novo mapeamento</CardTitle>
        <CardText>Conecte o ID do produto vendido fora com o produto interno da area.</CardText>
        <form action={createIntegrationMapping} className="mt-5 grid gap-4 md:grid-cols-3">
          <FormField label="Plataforma">
            <Select name="provider" required>
              <option value="kiwify">Kiwify</option>
              <option value="eduzz">Eduzz</option>
            </Select>
          </FormField>
          <FormField label="ID do produto externo">
            <Input name="external_product_id" placeholder="ID na plataforma" required />
          </FormField>
          <FormField label="Produto interno">
            <Select name="product_id" required>
              <option value="">Selecione</option>
              {(products ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-3">
            <Button type="submit">Salvar mapeamento</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Mapeamentos ativos</CardTitle>
        <div className="mt-4 divide-y divide-gray-100">
          {(mappings ?? []).map((mapping) => {
            const product = mapping.products as unknown as { name: string } | null;
            return (
              <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between" key={mapping.id}>
                <div>
                  <p className="text-sm font-medium text-gray-950">{mapping.provider}</p>
                  <p className="text-xs text-gray-500">{mapping.external_product_id}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                  {product?.name ?? "Produto"}
                </span>
              </div>
            );
          })}
          {(mappings ?? []).length === 0 && (
            <p className="py-4 text-sm text-gray-500">Nenhum mapeamento cadastrado ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
