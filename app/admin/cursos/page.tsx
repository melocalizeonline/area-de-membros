import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  Layers3,
  LibraryBig,
  Plus,
  Search,
  Sparkles,
  Video
} from "lucide-react";
import { createCourse, createCourseModule, createLesson } from "@/app/actions/admin";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

type CoursesAdminSearchParams = Promise<{
  q?: string;
  status?: string;
  product?: string;
}>;

type CourseItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  published: boolean;
  product_id: string | null;
  sort_order: number;
};

type ModuleItem = {
  id: string;
  title: string;
  course_id: string;
  sort_order: number;
};

type LessonItem = {
  id: string;
  title: string;
  module_id: string;
  video_provider: string;
  published: boolean;
  duration_seconds: number | null;
  sort_order: number;
};

export default async function CoursesAdminPage({
  searchParams
}: {
  searchParams: CoursesAdminSearchParams;
}) {
  const filters = await searchParams;
  const query = String(filters.q ?? "").trim().toLowerCase();
  const status = filters.status ?? "all";
  const productFilter = filters.product ?? "all";

  const supabase = await createClient();
  const [{ data: products }, { data: courses }, { data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("products").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("courses")
      .select("id, title, slug, description, cover_url, published, product_id, sort_order")
      .order("sort_order"),
    supabase.from("course_modules").select("id, title, course_id, sort_order").order("sort_order"),
    supabase
      .from("lessons")
      .select("id, title, module_id, video_provider, published, duration_seconds, sort_order")
      .order("sort_order")
  ]);

  const courseItems = (courses ?? []) as CourseItem[];
  const moduleItems = (modules ?? []) as ModuleItem[];
  const lessonItems = (lessons ?? []) as LessonItem[];
  const productMap = new Map((products ?? []).map((product) => [product.id, product.name]));

  const filteredCourses = courseItems.filter((course) => {
    const productName = course.product_id ? productMap.get(course.product_id) ?? "" : "";
    const matchesSearch =
      !query ||
      course.title.toLowerCase().includes(query) ||
      course.slug.toLowerCase().includes(query) ||
      productName.toLowerCase().includes(query);
    const matchesStatus =
      status === "all" ||
      (status === "published" && course.published) ||
      (status === "draft" && !course.published);
    const matchesProduct = productFilter === "all" || course.product_id === productFilter;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  const totalModules = moduleItems.length;
  const totalLessons = lessonItems.length;
  const publishedCourses = courseItems.filter((course) => course.published).length;
  const draftCourses = courseItems.length - publishedCourses;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              <Sparkles className="h-3.5 w-3.5" />
              Admin de cursos
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">
              Organize seus cursos com mais clareza.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Visao visual para acompanhar cursos, produtos vinculados, estrutura de modulos e aulas.
              A ordenacao por arrastar fica para a proxima fase, usando os campos de ordem ja existentes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Cursos" value={courseItems.length} />
            <MetricCard label="Publicados" value={publishedCourses} />
            <MetricCard label="Rascunhos" value={draftCourses} />
            <MetricCard label="Aulas" value={totalLessons} />
          </div>
        </div>
      </section>

      <Card className="p-4">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_220px_auto]" method="get">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              defaultValue={filters.q ?? ""}
              name="q"
              placeholder="Buscar por curso, slug ou produto"
            />
          </label>
          <Select defaultValue={status} name="status">
            <option value="all">Todos status</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
          </Select>
          <Select defaultValue={productFilter} name="product">
            <option value="all">Todos produtos</option>
            {(products ?? []).map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button className="gap-2" type="submit">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              href="/admin/cursos"
            >
              Limpar
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Biblioteca de cursos</h2>
              <p className="mt-1 text-sm text-gray-600">
                {filteredCourses.length} curso(s) encontrados de {courseItems.length} cadastrados.
              </p>
            </div>
            <a
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800"
              href="#novo-curso"
            >
              <Plus className="h-4 w-4" />
              Criar novo curso
            </a>
          </div>

          {filteredCourses.length === 0 ? (
            <EmptyState
              description="Ajuste a busca ou crie seu primeiro curso para comecar a montar a biblioteca."
              icon={LibraryBig}
              title="Nenhum curso encontrado"
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredCourses.map((course) => {
                const courseModules = moduleItems.filter((moduleItem) => moduleItem.course_id === course.id);
                const courseModuleIds = new Set(courseModules.map((moduleItem) => moduleItem.id));
                const courseLessons = lessonItems.filter((lesson) => courseModuleIds.has(lesson.module_id));
                const publishedLessons = courseLessons.filter((lesson) => lesson.published).length;
                const structureScore = getStructureScore(course, courseModules.length, courseLessons.length);

                return (
                  <article
                    className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                    key={course.id}
                  >
                    <div
                      className="relative flex min-h-44 items-end bg-gray-950 p-5 text-white"
                      style={
                        course.cover_url
                          ? {
                              backgroundImage: `linear-gradient(180deg, rgba(3, 7, 18, 0.12), rgba(3, 7, 18, 0.88)), url(${course.cover_url})`,
                              backgroundPosition: "center",
                              backgroundSize: "cover"
                            }
                          : undefined
                      }
                    >
                      {!course.cover_url && (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(20,184,166,0.45),transparent_28%),linear-gradient(135deg,#111827,#0f766e)]" />
                      )}
                      <div className="relative w-full">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <StatusBadge published={course.published} />
                          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                            Ordem {course.sort_order}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-xl font-semibold tracking-tight">{course.title}</h3>
                        <p className="mt-1 text-xs text-white/70">{course.slug}</p>
                      </div>
                    </div>

                    <div className="space-y-5 p-5">
                      <p className="line-clamp-2 min-h-11 text-sm leading-6 text-gray-600">
                        {course.description ?? "Adicione uma descricao para deixar o curso mais claro no catalogo."}
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        <MiniStat icon={Layers3} label="Modulos" value={courseModules.length} />
                        <MiniStat icon={Video} label="Aulas" value={courseLessons.length} />
                        <MiniStat icon={CheckCircle2} label="Pub." value={publishedLessons} />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                          <span>Estrutura do curso</span>
                          <span>{structureScore}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-teal-600" style={{ width: `${structureScore}%` }} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {course.product_id ? productMap.get(course.product_id) ?? "Produto removido" : "Sem produto"}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {formatDuration(courseLessons.reduce((total, lesson) => total + (lesson.duration_seconds ?? 0), 0))}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <a
                          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800"
                          href={`#estrutura-${course.id}`}
                        >
                          <ClipboardList className="h-4 w-4" />
                          Estrutura
                        </a>
                        <Link
                          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                          href={`/dashboard/cursos/${course.slug}`}
                        >
                          <Eye className="h-4 w-4" />
                          Visualizar
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <Card id="novo-curso">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Novo curso</CardTitle>
                <CardText>Crie a base do curso e vincule ao produto.</CardText>
              </div>
            </div>
            <form action={createCourse} className="mt-5 space-y-4">
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
              <FormField label="Titulo">
                <Input name="title" required />
              </FormField>
              <FormField label="Slug">
                <Input name="slug" placeholder="curso-principal" required />
              </FormField>
              <FormField label="Descricao">
                <Textarea name="description" />
              </FormField>
              <FormField label="Ordem">
                <Input defaultValue="1" name="sort_order" type="number" />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input defaultChecked name="published" type="checkbox" />
                Publicado
              </label>
              <Button className="w-full" type="submit">
                Criar curso
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle>Novo modulo</CardTitle>
            <CardText>Adicione blocos de conteudo aos cursos existentes.</CardText>
            <form action={createCourseModule} className="mt-5 space-y-4">
              <FormField label="Curso">
                <Select name="course_id" required>
                  <option value="">Selecione</option>
                  {courseItems.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Titulo">
                <Input name="title" required />
              </FormField>
              <FormField label="Ordem">
                <Input defaultValue="1" name="sort_order" type="number" />
              </FormField>
              <Button className="w-full" variant="secondary" type="submit">
                Criar modulo
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle>Nova aula</CardTitle>
            <CardText>Cadastre uma aula dentro de um modulo.</CardText>
            <form action={createLesson} className="mt-5 space-y-4">
              <FormField label="Modulo">
                <Select name="module_id" required>
                  <option value="">Selecione</option>
                  {moduleItems.map((moduleItem) => (
                    <option key={moduleItem.id} value={moduleItem.id}>
                      {moduleItem.title}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Titulo">
                <Input name="title" required />
              </FormField>
              <FormField label="Provedor">
                <Select name="video_provider" required>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="panda">Panda</option>
                  <option value="embed">Embed</option>
                  <option value="self_hosted">Proprio</option>
                </Select>
              </FormField>
              <FormField label="URL do video">
                <Input name="video_url" placeholder="https://..." />
              </FormField>
              <FormField label="Duracao em segundos">
                <Input defaultValue="0" name="duration_seconds" type="number" />
              </FormField>
              <FormField label="Descricao">
                <Textarea name="description" />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input defaultChecked name="published" type="checkbox" />
                Publicada
              </label>
              <Button className="w-full" variant="secondary" type="submit">
                Criar aula
              </Button>
            </form>
          </Card>
        </aside>
      </div>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Mapa da estrutura</CardTitle>
            <CardText>Leitura rapida de modulos e aulas por curso, na ordem salva no banco.</CardText>
          </div>
          <span className="text-sm text-gray-500">{totalModules} modulo(s)</span>
        </div>
        <div className="mt-5 space-y-4">
          {filteredCourses.map((course) => {
            const courseModules = moduleItems.filter((moduleItem) => moduleItem.course_id === course.id);

            return (
              <section className="rounded-lg border border-gray-200 p-4" id={`estrutura-${course.id}`} key={course.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{course.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {course.product_id ? productMap.get(course.product_id) ?? "Produto removido" : "Sem produto vinculado"}
                    </p>
                  </div>
                  <StatusBadge published={course.published} />
                </div>
                <div className="mt-4 space-y-3">
                  {courseModules.map((moduleItem) => {
                    const moduleLessons = lessonItems.filter((lesson) => lesson.module_id === moduleItem.id);

                    return (
                      <div className="rounded-md bg-gray-50 p-3" key={moduleItem.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{moduleItem.title}</p>
                            <p className="mt-1 text-xs text-gray-500">Ordem {moduleItem.sort_order}</p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-600">
                            {moduleLessons.length} aula(s)
                          </span>
                        </div>
                        {moduleLessons.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {moduleLessons.map((lesson) => (
                              <div
                                className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                                key={lesson.id}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-gray-900">{lesson.title}</p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {lesson.video_provider} - ordem {lesson.sort_order} - {formatDuration(lesson.duration_seconds ?? 0)}
                                  </p>
                                </div>
                                <span
                                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                                    lesson.published ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {lesson.published ? "Publicada" : "Rascunho"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {courseModules.length === 0 && (
                    <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      Nenhum modulo cadastrado ainda.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-2xl font-semibold text-gray-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Layers3;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <Icon className="h-4 w-4 text-gray-500" />
      <p className="mt-2 text-lg font-semibold text-gray-950">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        published ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {published ? "Publicado" : "Rascunho"}
    </span>
  );
}

function getStructureScore(course: CourseItem, moduleCount: number, lessonCount: number) {
  const checks = [
    Boolean(course.title),
    Boolean(course.description),
    Boolean(course.cover_url),
    Boolean(course.product_id),
    moduleCount > 0,
    lessonCount > 0,
    course.published
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Sem duracao";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}
