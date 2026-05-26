import { notFound } from "next/navigation";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
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
    .select("id, title, description, published, cover_url")
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
    .select("id, module_id, title, description, video_provider, video_url, embed_code, duration_seconds, sort_order")
        .eq("published", true)
        .in("module_id", moduleIds)
        .order("sort_order")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="relative min-h-56 bg-gradient-to-br from-gray-950 via-teal-900 to-cyan-800 p-6 text-white">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_30%_25%,white_0,transparent_24%),radial-gradient(circle_at_75%_55%,white_0,transparent_20%)]" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Curso</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{course.title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/75">{course.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {(modules ?? []).map((moduleItem) => {
          const moduleLessons = (lessons ?? []).filter((lesson) => lesson.module_id === moduleItem.id);
          return (
            <Card key={moduleItem.id}>
              <CardTitle>{moduleItem.title}</CardTitle>
              <div className="mt-4 divide-y divide-gray-100">
                {moduleLessons.map((lesson) => (
                  <Link
                    className="flex items-center gap-3 py-3 transition hover:bg-gray-50"
                    href={`/dashboard/cursos/${slug}/aulas/${lesson.id}`}
                    key={lesson.id}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-950">{lesson.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {lesson.video_provider} {lesson.video_url ? "- video configurado" : "- aguardando video"}
                      </p>
                    </div>
                    <span className="hidden rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 sm:block">
                      {formatDuration(lesson.duration_seconds)}
                    </span>
                  </Link>
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

function formatDuration(seconds: number | null) {
  if (!seconds) return "Aula";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
