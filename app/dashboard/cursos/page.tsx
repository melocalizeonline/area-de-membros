import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function CoursesPage() {
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
  const { data: courses } = productIds.length
    ? await supabase
        .from("courses")
        .select("id, title, slug, description")
        .eq("published", true)
        .in("product_id", productIds)
        .order("sort_order")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Cursos</h1>
        <p className="mt-1 text-sm text-gray-600">Continue seus estudos por aqui.</p>
      </div>

      {(courses ?? []).length === 0 ? (
        <EmptyState
          description="Quando um produto com curso for liberado para sua conta, ele aparece nesta area."
          icon={BookOpen}
          title="Nenhum curso liberado ainda"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(courses ?? []).map((course) => (
            <Link href={`/dashboard/cursos/${course.slug}`} key={course.id}>
              <Card className="group h-full transition hover:-translate-y-0.5 hover:border-teal-500">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{course.title}</CardTitle>
                    <CardText>{course.description ?? "Curso disponivel para sua conta."}</CardText>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
