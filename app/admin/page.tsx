import Link from "next/link";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const [{ count: members }, { count: products }, { count: courses }, { count: tools }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("tools").select("id", { count: "exact", head: true })
    ]);

  const stats = [
    { label: "Membros", value: members ?? 0 },
    { label: "Produtos", value: products ?? 0 },
    { label: "Cursos", value: courses ?? 0 },
    { label: "Ferramentas", value: tools ?? 0 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Admin</h1>
        <p className="mt-1 text-sm text-gray-600">Controle produtos, acessos e integracoes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/membros">
          <Card className="transition hover:border-teal-500">
            <CardTitle>Membros</CardTitle>
            <CardText>Convide usuarios e libere produtos manualmente.</CardText>
          </Card>
        </Link>
        <Link href="/admin/produtos">
          <Card className="transition hover:border-teal-500">
            <CardTitle>Produtos</CardTitle>
            <CardText>Mapeie o que sera liberado depois da compra.</CardText>
          </Card>
        </Link>
        <Link href="/admin/cursos">
          <Card className="transition hover:border-teal-500">
            <CardTitle>Cursos</CardTitle>
            <CardText>Cadastre cursos, modulos e aulas.</CardText>
          </Card>
        </Link>
        <Link href="/admin/ferramentas">
          <Card className="transition hover:border-teal-500">
            <CardTitle>Ferramentas</CardTitle>
            <CardText>Crie recursos internos ou links externos.</CardText>
          </Card>
        </Link>
        <Link href="/admin/integracoes">
          <Card className="transition hover:border-teal-500">
            <CardTitle>Integracoes</CardTitle>
            <CardText>Prepare webhooks de Kiwify, Eduzz e video.</CardText>
          </Card>
        </Link>
      </div>
    </div>
  );
}
