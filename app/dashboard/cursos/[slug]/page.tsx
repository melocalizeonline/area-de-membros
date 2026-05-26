import { notFound } from "next/navigation";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, published")
    .eq("slug", slug)
    .single();

  if (!course?.published) notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", course.id)
    .order("sort_order");

  const moduleIds = (modules ?? []).map((moduleItem) => moduleItem.id);
  const { data: lessons } = moduleIds.length
    ? await supabase
        .from("lessons")
        .select("id, module_id, title, description, video_provider, video_url, embed_code, sort_order")
        .eq("published", true)
        .in("module_id", moduleIds)
        .order("sort_order")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">{course.title}</h1>
        <p className="mt-1 text-sm text-gray-600">{course.description}</p>
      </div>

      <div className="space-y-4">
        {(modules ?? []).map((moduleItem) => {
          const moduleLessons = (lessons ?? []).filter((lesson) => lesson.module_id === moduleItem.id);
          return (
            <Card key={moduleItem.id}>
              <CardTitle>{moduleItem.title}</CardTitle>
              <div className="mt-4 divide-y divide-gray-100">
                {moduleLessons.map((lesson) => (
                  <div className="py-3" key={lesson.id}>
                    <p className="text-sm font-medium text-gray-950">{lesson.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {lesson.video_provider} {lesson.video_url ? "- video configurado" : "- aguardando video"}
                    </p>
                  </div>
                ))}
                {moduleLessons.length === 0 && (
                  <CardText>Nenhuma aula publicada neste modulo.</CardText>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
