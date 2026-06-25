"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin, createAdminClient } from "@/lib/supabase/server";
import type { IntegrationProvider, VideoProvider } from "@/types/database";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

export async function createProduct(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("products").insert({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    external_product_id: nullableText(formData, "external_product_id"),
    status: bool(formData, "active") ? "active" : "inactive"
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/produtos");
  revalidatePath("/admin");
}

export async function createCourse(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("courses").insert({
    product_id: text(formData, "product_id"),
    title: text(formData, "title"),
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    published: bool(formData, "published"),
    sort_order: numberValue(formData, "sort_order", 0)
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
}

export async function createCourseModule(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("course_modules").insert({
    course_id: text(formData, "course_id"),
    title: text(formData, "title"),
    sort_order: numberValue(formData, "sort_order", 0)
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
}

export async function createLesson(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("lessons").insert({
    module_id: text(formData, "module_id"),
    title: text(formData, "title"),
    description: nullableText(formData, "description"),
    video_provider: text(formData, "video_provider") as VideoProvider,
    video_url: nullableText(formData, "video_url"),
    embed_code: nullableText(formData, "embed_code"),
    duration_seconds: numberValue(formData, "duration_seconds", 0),
    published: bool(formData, "published"),
    sort_order: numberValue(formData, "sort_order", 0)
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
}

export async function setCoursePublished(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("courses")
    .update({ published: bool(formData, "published") })
    .eq("id", text(formData, "id"));

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
}

export async function deleteCourse(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("courses").delete().eq("id", text(formData, "id"));

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
}

export async function deleteCourseModule(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("course_modules").delete().eq("id", text(formData, "id"));

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
}

export async function setLessonPublished(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("lessons")
    .update({ published: bool(formData, "published") })
    .eq("id", text(formData, "id"));

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
}

export async function deleteLesson(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("lessons").delete().eq("id", text(formData, "id"));

  if (error) throw new Error(error.message);
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
}

export async function createTool(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("tools").insert({
    product_id: text(formData, "product_id"),
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    tool_type: text(formData, "tool_type") === "external" ? "external" : "internal",
    external_url: nullableText(formData, "external_url"),
    published: bool(formData, "published"),
    sort_order: numberValue(formData, "sort_order", 0)
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/ferramentas");
  revalidatePath("/dashboard");
}

export async function inviteMember(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();
  const email = text(formData, "email");
  const name = text(formData, "name") || email;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
    data: { name }
  });

  if (error) throw new Error(error.message);

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name,
      email,
      active: true,
      is_admin: bool(formData, "is_admin")
    });

    if (profileError) throw new Error(profileError.message);
  }

  revalidatePath("/admin/membros");
  revalidatePath("/admin");
}

export async function grantProductAccess(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();
  const email = text(formData, "email");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profileError || !profile) throw new Error("Membro nao encontrado.");

  const { error } = await supabase.from("member_products").upsert(
    {
      member_id: profile.id,
      product_id: text(formData, "product_id"),
      source: "manual",
      active: true
    },
    { onConflict: "member_id,product_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/admin/membros");
  revalidatePath("/dashboard");
}

export async function createIntegrationMapping(formData: FormData) {
  await assertAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("integration_mappings").upsert(
    {
      provider: text(formData, "provider") as IntegrationProvider,
      external_product_id: text(formData, "external_product_id"),
      product_id: text(formData, "product_id"),
      active: true
    },
    { onConflict: "provider,external_product_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/admin/integracoes");
}
