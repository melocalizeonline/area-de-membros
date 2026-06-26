import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────────────────────────
   usePortalCoursesProgress — progresso de VÁRIOS
   cursos de uma vez (pra galeria do portal).
   Por curso: total de aulas ativas, concluídas,
   % e última atividade (pra "continue assistindo").
   ───────────────────────────────────────────── */

export interface CourseProgress {
  total: number;
  completed: number;
  percent: number; // 0–100
  lastActivity: string | null; // max(updated_at) das aulas do curso
}

/** mapa { courseSlug → progresso }. */
export type CoursesProgressMap = Record<string, CourseProgress>;

interface RawLesson {
  id: string;
  is_active: boolean;
}
interface RawModule {
  lessons: RawLesson[] | null;
}
interface RawCourse {
  slug: string;
  modules: RawModule[] | null;
}

export function usePortalCoursesProgress(
  tenantId: string | undefined,
  courseSlugs: string[],
  userId: string | undefined,
) {
  const key = [...courseSlugs].sort().join(",");
  return useQuery({
    queryKey: ["portal-courses-progress", tenantId, userId, key],
    enabled: !!tenantId && !!userId && courseSlugs.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<CoursesProgressMap> => {
      if (!tenantId || !userId || courseSlugs.length === 0) return {};

      // 1) cursos → aulas ativas (ids)
      const { data: courses, error } = await supabase
        .from("courses")
        .select("slug, modules(lessons(id, is_active))")
        .eq("tenant_id", tenantId)
        .in("slug", courseSlugs);

      if (error) {
        console.warn("[usePortalCoursesProgress] cursos:", error.message);
        return {};
      }

      const slugLessons: Record<string, string[]> = {};
      const allLessonIds: string[] = [];
      for (const c of (courses ?? []) as RawCourse[]) {
        const ids = (c.modules ?? []).flatMap((m) =>
          (m.lessons ?? []).filter((l) => l.is_active).map((l) => l.id),
        );
        slugLessons[c.slug] = ids;
        allLessonIds.push(...ids);
      }
      if (allLessonIds.length === 0) {
        return Object.fromEntries(
          courseSlugs.map((s) => [s, { total: 0, completed: 0, percent: 0, lastActivity: null }]),
        );
      }

      // 2) progresso do usuário nessas aulas
      const { data: prog, error: progErr } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed, updated_at")
        .eq("user_id", userId)
        .in("lesson_id", allLessonIds);

      if (progErr) {
        console.warn("[usePortalCoursesProgress] progresso:", progErr.message);
      }

      const done = new Set<string>();
      const lastByLesson: Record<string, string> = {};
      for (const r of prog ?? []) {
        if (r.completed) done.add(r.lesson_id as string);
        if (r.updated_at) lastByLesson[r.lesson_id as string] = r.updated_at as string;
      }

      const map: CoursesProgressMap = {};
      for (const slug of Object.keys(slugLessons)) {
        const ids = slugLessons[slug];
        const total = ids.length;
        const completed = ids.filter((id) => done.has(id)).length;
        const lastActivity =
          ids.map((id) => lastByLesson[id]).filter(Boolean).sort().pop() ?? null;
        map[slug] = {
          total,
          completed,
          percent: total ? Math.round((completed / total) * 100) : 0,
          lastActivity,
        };
      }
      return map;
    },
  });
}
