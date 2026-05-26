import { BookOpen } from "lucide-react";
import { ContentCard } from "@/components/content-card";
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
        .select("id, title, slug, description, cover_url")
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
          {(courses ?? []).map((course, index) => (
            <ContentCard
              description={course.description ?? "Curso disponivel para sua conta."}
              href={`/dashboard/cursos/${course.slug}`}
              icon="BookOpen"
              index={index}
              key={course.id}
              label="Curso"
              progress={index === 0 ? 18 : 0}
              title={course.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}
