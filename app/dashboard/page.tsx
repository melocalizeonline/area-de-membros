import Link from "next/link";
import { ArrowRight, BookOpen, Boxes, Clock3, Plug, Wrench } from "lucide-react";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const productIds = await getProductIds(user?.id);

  const [{ data: courses }, { data: tools }] = await Promise.all([
    productIds.length
      ? supabase
          .from("courses")
          .select("id, title, slug, description")
          .eq("published", true)
          .in("product_id", productIds)
          .order("sort_order")
          .limit(3)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase
          .from("tools")
          .select("id, name, slug, description")
          .eq("published", true)
          .in("product_id", productIds)
          .order("sort_order")
          .limit(3)
      : Promise.resolve({ data: [] })
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-teal-900/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Area exclusiva
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 md:text-3xl">
              Seus cursos, ferramentas e materiais em um so lugar.
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Esta area libera conteudos conforme os produtos comprados ou adicionados pelo admin.
            </p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-2xl font-semibold text-gray-950">{courses?.length ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">Cursos recentes</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-2xl font-semibold text-gray-950">{tools?.length ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">Ferramentas recentes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/cursos">
          <Card className="group h-full transition hover:-translate-y-0.5 hover:border-teal-500">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
            </div>
            <CardTitle className="mt-4">Cursos</CardTitle>
            <CardText>
              {courses?.length ? `${courses.length} curso(s) recente(s)` : "Nenhum curso liberado ainda."}
            </CardText>
          </Card>
        </Link>

        <Link href="/dashboard/ferramentas">
          <Card className="group h-full transition hover:-translate-y-0.5 hover:border-teal-500">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                <Wrench className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
            </div>
            <CardTitle className="mt-4">Ferramentas</CardTitle>
            <CardText>
              {tools?.length ? `${tools.length} ferramenta(s) recente(s)` : "Nenhuma ferramenta liberada ainda."}
            </CardText>
          </Card>
        </Link>

        <Link href="/admin/integracoes">
          <Card className="group h-full transition hover:-translate-y-0.5 hover:border-amber-500">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                <Plug className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-amber-700" />
            </div>
            <CardTitle className="mt-4">Integracoes</CardTitle>
            <CardText>Conecte Kiwify, Eduzz e provedores de video quando estiver pronto.</CardText>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Continue de onde parou</CardTitle>
              <CardText>Quando houver aulas cadastradas, elas aparecem aqui com acesso rapido.</CardText>
            </div>
            <Clock3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            Nenhuma atividade recente.
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Produtos ativos</CardTitle>
              <CardText>Acesso vinculado a compras ou liberacoes manuais.</CardText>
            </div>
            <Boxes className="h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-gray-950">{productIds.length}</p>
        </Card>
      </div>
    </div>
  );
}

async function getProductIds(memberId: string | undefined) {
  if (!memberId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_products")
    .select("product_id")
    .eq("member_id", memberId)
    .eq("active", true);

  return (data ?? []).map((item) => item.product_id);
}
