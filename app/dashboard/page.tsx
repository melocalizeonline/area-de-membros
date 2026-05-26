import Link from "next/link";
import { BookOpen, Wrench } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Inicio</h1>
        <p className="mt-1 text-sm text-gray-600">
          Acesse os cursos e ferramentas liberados para sua conta.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/cursos">
          <Card className="h-full transition hover:border-teal-500">
            <BookOpen className="h-5 w-5 text-teal-700" />
            <CardTitle className="mt-4">Cursos</CardTitle>
            <CardText>{courses?.length ? `${courses.length} curso(s) recente(s)` : "Nenhum curso liberado ainda."}</CardText>
          </Card>
        </Link>

        <Link href="/dashboard/ferramentas">
          <Card className="h-full transition hover:border-teal-500">
            <Wrench className="h-5 w-5 text-teal-700" />
            <CardTitle className="mt-4">Ferramentas</CardTitle>
            <CardText>{tools?.length ? `${tools.length} ferramenta(s) recente(s)` : "Nenhuma ferramenta liberada ainda."}</CardText>
          </Card>
        </Link>
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
