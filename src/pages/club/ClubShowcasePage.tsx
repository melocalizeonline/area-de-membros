import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LIGHT_VARS, DARK_VARS } from "@/lib/showcase-theme";
import { getCoversOptimizedUrl, getOptimizedUrl } from "@/lib/storage-urls";

interface ShowcaseCourseRow {
  id: string;
  title: string;
  description: string | null;
  cover_horizontal_url: string | null;
  updated_at: string;
  portal_visibility: string | null;
}

interface ShowcaseCourseJoin {
  sort_order: number | null;
  courses: ShowcaseCourseRow | null;
}

export default function ClubShowcasePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: showcase, isLoading } = useQuery({
    queryKey: ["club-showcase", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("showcases")
        .select("*, showcase_courses(*, courses(*))")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch which courses the current user has access to (via course_customers)
  const { data: accessibleCourseIds = [] } = useQuery({
    queryKey: ["course-access", slug],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("course_customers")
        .select("course_id")
        .eq("user_id", user.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      if (error) return [];
      return data.map((r) => r.course_id);
    },
    enabled: !!showcase,
  });

  // Cursos para os quais o usuário já solicitou acesso (pendente)
  const { data: requestedCourseIds = [] } = useQuery({
    queryKey: ["access-requests-mine", slug],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("access_requests")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("status", "pending");
      return (data ?? []).map((r) => r.course_id);
    },
    enabled: !!showcase,
  });

  const [justRequested, setJustRequested] = useState<string[]>([]);

  const requestAccess = async (courseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Faça login para solicitar acesso.");
      return;
    }
    const tenantId = (showcase as { tenant_id?: string } | null)?.tenant_id;
    const { error } = await supabase.from("access_requests").upsert(
      { tenant_id: tenantId, course_id: courseId, user_id: user.id, status: "pending" },
      { onConflict: "course_id,user_id" },
    );
    if (error) {
      toast.error("Não foi possível enviar a solicitação agora.");
      return;
    }
    setJustRequested((prev) => [...prev, courseId]);
    toast.success("Solicitação de acesso enviada!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!showcase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Vitrine não encontrada</h1>
          <p className="text-muted-foreground">Esta vitrine não existe ou não está disponível.</p>
        </div>
      </div>
    );
  }

  const isDark = (showcase.theme || "dark") === "dark";
  const gridColumns = showcase.grid_columns || 4;
  const heroUrl = getOptimizedUrl(showcase.bg_url || showcase.hero_url, "cover-hero");

  // Sort courses by sort_order from the join table, fallback to title
  const courses = (showcase.showcase_courses as ShowcaseCourseJoin[] | undefined)
    ?.sort((a, b) => {
      if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
      if (a.sort_order != null) return -1;
      if (b.sort_order != null) return 1;
      return (a.courses?.title || "").localeCompare(b.courses?.title || "");
    })
    .map((sc) => sc.courses)
    .filter(Boolean)
    // Esconde cursos sem acesso, exceto os marcados como "apenas ver" (locked)
    .filter((c) => {
      const co = c as ShowcaseCourseRow;
      return accessibleCourseIds.includes(co.id) || co.portal_visibility === "locked";
    }) as ShowcaseCourseRow[] || [];

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={isDark ? DARK_VARS : LIGHT_VARS}
    >
      {/* Hero */}
      <div className="relative w-full aspect-[3/1] max-h-[400px] overflow-hidden">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={showcase.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-muted">
            <span className="text-sm opacity-40">Imagem de capa</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
          <div className="p-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-white">{showcase.title}</h1>
            {showcase.description && (
              <p className="mt-2 text-lg text-white/80 max-w-2xl">{showcase.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="px-8 py-8">
        {!courses.length ? (
          <p className="text-muted-foreground text-center py-12">
            Nenhum curso disponível nesta vitrine.
          </p>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            }}
          >
            {courses.map((course) => {
              const coverUrl = course.cover_horizontal_url
                ? getCoversOptimizedUrl(
                    course.cover_horizontal_url,
                    "cover-card-horizontal",
                    course.updated_at
                  )
                : null;
              const hasAccess = accessibleCourseIds.includes(course.id);
              const isRequested =
                requestedCourseIds.includes(course.id) || justRequested.includes(course.id);

              return (
                <div
                  key={course.id}
                  className={cn(
                    "rounded-2xl border border-border bg-card overflow-hidden group relative",
                    !hasAccess && "opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "aspect-[16/10]",
                      "bg-muted overflow-hidden relative"
                    )}
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={course.title}
                        className={cn(
                          "size-full object-cover transition-transform duration-300",
                          hasAccess && "group-hover:scale-105"
                        )}
                      />
                    ) : (
                      <div className="size-full bg-muted" />
                    )}
                    {!hasAccess && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Lock className="size-8 text-white/80" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground truncate">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    {!hasAccess && (
                      isRequested ? (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <Check className="size-4" /> Acesso solicitado
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => requestAccess(course.id)}
                          className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                        >
                          <Lock className="size-3.5" /> Solicitar acesso
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
