import Link from "next/link";
import { BookOpen, Boxes, Clock3, FileText, Wrench } from "lucide-react";
import { ContentCard } from "@/components/content-card";
import { FeaturedLesson } from "@/components/featured-lesson";
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
          .select("id, title, slug, description, cover_url")
          .eq("published", true)
          .in("product_id", productIds)
          .order("sort_order")
          .limit(3)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase
          .from("tools")
          .select("id, name, slug, description, tool_type, external_url")
          .eq("published", true)
          .in("product_id", productIds)
          .order("sort_order")
          .limit(3)
      : Promise.resolve({ data: [] })
  ]);
  const learningProgress = await getLearningProgress(user?.id, courses ?? []);

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

      {learningProgress.featuredLesson && (
        <FeaturedLesson
          courseTitle={learningProgress.featuredLesson.courseTitle}
          duration={formatDuration(learningProgress.featuredLesson.duration)}
          href={`/dashboard/cursos/${learningProgress.featuredLesson.courseSlug}/aulas/${learningProgress.featuredLesson.lessonId}`}
          title={learningProgress.featuredLesson.title}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/cursos">
          <Card className="h-full transition hover:-translate-y-0.5 hover:border-teal-500">
            <BookOpen className="h-5 w-5 text-teal-700" />
            <CardTitle className="mt-4">Cursos</CardTitle>
            <CardText>{courses?.length ? `${courses.length} curso(s) liberado(s)` : "Nenhum curso liberado ainda."}</CardText>
          </Card>
        </Link>

        <Link href="/dashboard/ferramentas">
          <Card className="h-full transition hover:-translate-y-0.5 hover:border-teal-500">
            <Wrench className="h-5 w-5 text-sky-700" />
            <CardTitle className="mt-4">Ferramentas</CardTitle>
            <CardText>{tools?.length ? `${tools.length} ferramenta(s) liberada(s)` : "Nenhuma ferramenta liberada ainda."}</CardText>
          </Card>
        </Link>

        <Link href="/dashboard/materiais">
          <Card className="h-full transition hover:-translate-y-0.5 hover:border-teal-500">
            <FileText className="h-5 w-5 text-amber-700" />
            <CardTitle className="mt-4">Materiais</CardTitle>
            <CardText>PDFs, links, templates e arquivos liberados aparecem aqui.</CardText>
          </Card>
        </Link>
      </div>

      {(courses ?? []).length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950">Cursos em destaque</h2>
              <p className="mt-1 text-sm text-gray-600">Acesse rapidamente os conteudos liberados.</p>
            </div>
            <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" href="/dashboard/cursos">
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(courses ?? []).map((course, index) => (
              <ContentCard
                description={course.description ?? "Curso disponivel para sua conta."}
                href={`/dashboard/cursos/${course.slug}`}
                icon="BookOpen"
                index={index}
                key={course.id}
                label="Curso"
                progress={learningProgress.progressByCourse[course.id] ?? 0}
                title={course.title}
              />
            ))}
          </div>
        </section>
      )}

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

async function getLearningProgress(
  memberId: string | undefined,
  courses: { id: string; title: string; slug: string }[]
) {
  const empty = {
    featuredLesson: null as null | {
      title: string;
      lessonId: string;
      duration: number | null;
      courseTitle: string;
      courseSlug: string;
    },
    progressByCourse: {} as Record<string, number>
  };
  const courseIds = courses.map((course) => course.id);
  if (courseIds.length === 0) return empty;
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, course_id")
    .in("course_id", courseIds)
    .order("sort_order");

  const moduleIds = (modules ?? []).map((moduleItem) => moduleItem.id);
  if (moduleIds.length === 0) return empty;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, module_id, title, duration_seconds")
    .in("module_id", moduleIds)
    .eq("published", true)
    .order("sort_order");

  if (!lessons?.length) return empty;

  const lessonIds = lessons.map((lesson) => lesson.id);
  const { data: progressRows } = memberId
    ? await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("member_id", memberId)
        .in("lesson_id", lessonIds)
    : { data: [] };
  const completedLessons = new Set((progressRows ?? []).filter((row) => row.completed).map((row) => row.lesson_id));
  const moduleCourseMap = new Map((modules ?? []).map((moduleItem) => [moduleItem.id, moduleItem.course_id]));
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const progressByCourse: Record<string, number> = {};

  for (const course of courses) {
    const courseModuleIds = new Set((modules ?? []).filter((moduleItem) => moduleItem.course_id === course.id).map((moduleItem) => moduleItem.id));
    const courseLessons = lessons.filter((lesson) => courseModuleIds.has(lesson.module_id));
    const completedCount = courseLessons.filter((lesson) => completedLessons.has(lesson.id)).length;
    progressByCourse[course.id] = courseLessons.length ? Math.round((completedCount / courseLessons.length) * 100) : 0;
  }

  const featured = lessons.find((lesson) => !completedLessons.has(lesson.id)) ?? lessons[0];
  const featuredCourseId = moduleCourseMap.get(featured.module_id);
  const featuredCourse = featuredCourseId ? courseMap.get(featuredCourseId) : null;

  if (!featuredCourse) return { featuredLesson: null, progressByCourse };
  return {
    featuredLesson: {
      title: featured.title,
      lessonId: featured.id,
      duration: featured.duration_seconds,
      courseTitle: featuredCourse.title,
      courseSlug: featuredCourse.slug
    },
    progressByCourse
  };
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Aula disponivel";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}
