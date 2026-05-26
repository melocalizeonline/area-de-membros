import { grantProductAccess, inviteMember } from "@/app/actions/admin";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";

export default async function MembersAdminPage() {
  const supabase = await createClient();
  const [{ data: members }, { data: products }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, is_admin, active").order("created_at", { ascending: false }),
    supabase.from("products").select("id, name").eq("status", "active").order("name"),
    supabase.from("member_products").select("member_id, product_id, products(name)").eq("active", true)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Membros</h1>
        <p className="mt-1 text-sm text-gray-600">Convide usuarios e libere produtos manualmente.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Convidar membro</CardTitle>
          <CardText>Envia um convite pelo Supabase e cria o perfil do membro.</CardText>
          <form action={inviteMember} className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField label="Nome">
              <Input name="name" placeholder="Nome do membro" required />
            </FormField>
            <FormField label="E-mail">
              <Input name="email" placeholder="email@dominio.com" required type="email" />
            </FormField>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input name="is_admin" type="checkbox" />
              Tambem e admin
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Enviar convite</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardTitle>Liberar produto</CardTitle>
          <CardText>Use para liberar acesso manualmente enquanto as integracoes nao disparam.</CardText>
          <form action={grantProductAccess} className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField label="E-mail do membro">
              <Input name="email" placeholder="email@dominio.com" required type="email" />
            </FormField>
            <FormField label="Produto">
              <Select name="product_id" required>
                <option value="">Selecione</option>
                {(products ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="md:col-span-2">
              <Button type="submit">Liberar acesso</Button>
            </div>
          </form>
        </Card>
      </div>

      <Card>
        <CardTitle>Membros cadastrados</CardTitle>
        <div className="mt-4 divide-y divide-gray-100">
          {(members ?? []).map((member) => {
            const memberProducts = (access ?? []).filter((item) => item.member_id === member.id);
            return (
              <div className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between" key={member.id}>
                <div>
                  <p className="text-sm font-medium text-gray-950">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {member.is_admin && <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700">Admin</span>}
                  {!member.active && <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">Inativo</span>}
                  {memberProducts.map((item) => {
                    const product = item.products as unknown as { name: string } | null;
                    return (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700" key={item.product_id}>
                        {product?.name ?? "Produto"}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
