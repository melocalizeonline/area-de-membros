import { createCourse, createCourseModule, createLesson } from "@/app/actions/admin";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

export default async function CoursesAdminPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: courses }, { data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("products").select("id, name").eq("status", "active").order("name"),
    supabase.from("courses").select("id, title, slug, published, product_id").order("sort_order"),
    supabase.from("course_modules").select("id, title, course_id").order("sort_order"),
    supabase.from("lessons").select("id, title, module_id, video_provider, published").order("sort_order")
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Cursos</h1>
        <p className="mt-1 text-sm text-gray-600">Cadastre cursos, modulos e aulas vinculados aos produtos.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardTitle>Novo curso</CardTitle>
          <form action={createCourse} className="mt-5 space-y-4">
            <FormField label="Produto">
              <Select name="product_id" required>
                <option value="">Selecione</option>
                {(products ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
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
            <Button type="submit">Criar curso</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Novo modulo</CardTitle>
          <form action={createCourseModule} className="mt-5 space-y-4">
            <FormField label="Curso">
              <Select name="course_id" required>
                <option value="">Selecione</option>
                {(courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </Select>
            </FormField>
            <FormField label="Titulo">
              <Input name="title" required />
            </FormField>
            <FormField label="Ordem">
              <Input defaultValue="1" name="sort_order" type="number" />
            </FormField>
            <Button type="submit">Criar modulo</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Nova aula</CardTitle>
          <form action={createLesson} className="mt-5 space-y-4">
            <FormField label="Modulo">
              <Select name="module_id" required>
                <option value="">Selecione</option>
                {(modules ?? []).map((moduleItem) => <option key={moduleItem.id} value={moduleItem.id}>{moduleItem.title}</option>)}
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
            <Button type="submit">Criar aula</Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardTitle>Estrutura atual</CardTitle>
        <div className="mt-4 space-y-4">
          {(courses ?? []).map((course) => {
            const courseModules = (modules ?? []).filter((moduleItem) => moduleItem.course_id === course.id);
            return (
              <div className="rounded-lg border border-gray-200 p-4" key={course.id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{course.title}</p>
                    <p className="text-xs text-gray-500">{course.slug}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {course.published ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {courseModules.map((moduleItem) => (
                    <div className="rounded-md bg-gray-50 p-3" key={moduleItem.id}>
                      <p className="text-sm font-medium text-gray-800">{moduleItem.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {(lessons ?? []).filter((lesson) => lesson.module_id === moduleItem.id).length} aula(s)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
