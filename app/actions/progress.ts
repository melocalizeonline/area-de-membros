"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function markLessonCompleted(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nao autenticado.");

  const lessonId = formText(formData, "lesson_id");
  const courseSlug = formText(formData, "course_slug");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, module_id, duration_seconds")
    .eq("id", lessonId)
    .single();

  if (!lesson) throw new Error("Aula nao encontrada.");

  const { data: moduleItem } = await supabase
    .from("course_modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .single();

  if (!moduleItem) throw new Error("Modulo nao encontrado.");

  const { data: course } = await supabase
    .from("courses")
    .select("id, product_id, slug")
    .eq("id", moduleItem.course_id)
    .single();

  if (!course?.product_id) throw new Error("Curso nao encontrado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const { data: access } = await supabase
    .from("member_products")
    .select("product_id")
    .eq("member_id", user.id)
    .eq("product_id", course.product_id)
    .eq("active", true)
    .single();

  if (!access && !profile?.is_admin) {
    throw new Error("Acesso negado.");
  }

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      member_id: user.id,
      lesson_id: lesson.id,
      progress_seconds: lesson.duration_seconds ?? 0,
      completed: true
    },
    { onConflict: "member_id,lesson_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/cursos/${course.slug}`);
  revalidatePath(`/dashboard/cursos/${courseSlug || course.slug}/aulas/${lesson.id}`);
}
