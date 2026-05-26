import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { LessonPlayer } from "@/components/lesson-player";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string; lessonId: string }>;
}

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_provider: "youtube" | "vimeo" | "panda" | "embed" | "self_hosted";
  video_url: string | null;
  embed_code: string | null;
  duration_seconds: number | null;
  sort_order: number;
};

export default async function LessonPage({ params }: PageProps) {
  const { slug, lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, product_id, title, slug, description, published")
    .eq("slug", slug)
    .single();

  if (!course?.published || !course.product_id) notFound();

  const { data: access } = await supabase
    .from("member_products")
    .select("product_id")
    .eq("member_id", user.id)
    .eq("product_id", course.product_id)
    .eq("active", true)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!access && !profile?.is_admin) notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", course.id)
    .order("sort_order");

  const moduleIds = (modules ?? []).map((moduleItem) => moduleItem.id);
  if (moduleIds.length === 0) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, module_id, title, description, video_provider, video_url, embed_code, duration_seconds, sort_order")
    .eq("published", true)
    .in("module_id", moduleIds)
    .order("sort_order");

  const orderedLessons = (lessons ?? []) as LessonRow[];
  const lesson = orderedLessons.find((item) => item.id === lessonId);
  if (!lesson) notFound();

  const lessonIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
  const previousLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < orderedLessons.length - 1 ? orderedLessons[lessonIndex + 1] : null;
  const currentModule = (modules ?? []).find((moduleItem) => moduleItem.id === lesson.module_id);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="space-y-6">
        <Link className="inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800" href={`/dashboard/cursos/${course.slug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao curso
        </Link>

        <LessonPlayer
          embedCode={lesson.embed_code}
          provider={lesson.video_provider}
          title={lesson.title}
          videoUrl={lesson.video_url}
        />

        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                {currentModule?.title ?? "Aula"}
              </p>
              <CardTitle className="mt-2 text-xl">{lesson.title}</CardTitle>
              <CardText>{lesson.description ?? "Aula disponivel para este curso."}</CardText>
            </div>
            <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {formatDuration(lesson.duration_seconds)}
            </span>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {previousLesson ? (
            <LessonNavButton href={`/dashboard/cursos/${course.slug}/aulas/${previousLesson.id}`} label="Aula anterior" title={previousLesson.title} />
          ) : (
            <DisabledNav label="Aula anterior" />
          )}
          {nextLesson ? (
            <LessonNavButton align="right" href={`/dashboard/cursos/${course.slug}/aulas/${nextLesson.id}`} label="Proxima aula" title={nextLesson.title} />
          ) : (
            <DisabledNav align="right" label="Proxima aula" />
          )}
        </div>

        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Materiais da aula</CardTitle>
              <CardText>Estrutura preparada para anexos da Fase 5.</CardText>
            </div>
          </div>
        </Card>
      </main>

      <aside className="space-y-4">
        <Card>
          <CardTitle>{course.title}</CardTitle>
          <CardText>{course.description ?? "Curso liberado para sua conta."}</CardText>
        </Card>

        <Card>
          <CardTitle>Aulas do curso</CardTitle>
          <div className="mt-4 space-y-2">
            {orderedLessons.map((item, index) => (
              <Link
                className={`flex items-start gap-3 rounded-md border p-3 transition ${
                  item.id === lesson.id ? "border-teal-200 bg-teal-50" : "border-gray-200 hover:border-teal-300"
                }`}
                href={`/dashboard/cursos/${course.slug}/aulas/${item.id}`}
                key={item.id}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-gray-700">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-medium text-gray-900">{item.title}</span>
                  <span className="mt-1 block text-xs text-gray-500">{formatDuration(item.duration_seconds)}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function LessonNavButton({
  href,
  label,
  title,
  align = "left"
}: {
  href: string;
  label: string;
  title: string;
  align?: "left" | "right";
}) {
  return (
    <Link className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-teal-500 ${align === "right" ? "text-right" : ""}`} href={href}>
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-950">
        {align === "left" && <ArrowLeft className="h-4 w-4" />}
        <span className="line-clamp-1 flex-1">{title}</span>
        {align === "right" && <ArrowRight className="h-4 w-4" />}
      </span>
    </Link>
  );
}

function DisabledNav({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <div className={`rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-gray-400 ${align === "right" ? "text-right" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-[0.14em]">{label}</span>
      <span className="mt-1 block text-sm">Nao disponivel</span>
    </div>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Aula";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
