import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  NoryFlowGallery,
  type GalleryCourse,
  type GalleryRow,
} from "@/components/portal/NoryFlowGallery";
import { usePortal } from "@/contexts/PortalContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalProducts } from "@/hooks/usePortalProducts";
import { usePortalCoursesProgress } from "@/hooks/usePortalCoursesProgress";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ProductGallery01 } from "@/components/ProductGallery01";
import { getCoversOptimizedUrl } from "@/lib/storage-urls";
import { joinTitleSegments } from "@/lib/page-title";
import { TenantPublicFooter } from "@/components/tenant/TenantPublicFooter";
import { LIGHT_VARS, DARK_VARS } from "@/lib/showcase-theme";
import { getPortalThemeColors } from "@/lib/portal-theme";
import { CustomerPortalHeader } from "@/components/portal/CustomerPortalHeader";
import { useTheme } from "@/contexts/ThemeContext";

const PORTAL_PRODUCT_FALLBACK = "/images/placeholders/product-portal-fallback.svg";

export default function PortalHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut, profile, user } = useAuth();
  const { tenant, slug, accessRole, customer } = usePortal();
  usePageTitle(joinTitleSegments(t("portal.meta.home", "Portal do cliente"), tenant.name));
  const { data: products = [], isLoading } = usePortalProducts({
    tenantId: tenant.id,
    accessRole,
  });

  // Solicitações de acesso já feitas (produtos)
  const { data: requestedIds = [] } = useQuery({
    queryKey: ["portal-home-requests", tenant.id],
    enabled: accessRole === "customer",
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("access_requests")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .not("product_id", "is", null);
      return (data ?? []).map((r) => r.product_id as string);
    },
  });
  const [justRequested, setJustRequested] = useState<string[]>([]);

  const requestAccess = useCallback(async (productId: string) => {
    if (requestedIds.includes(productId) || justRequested.includes(productId)) {
      toast.info("Acesso já solicitado.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("access_requests").upsert(
      { tenant_id: tenant.id, product_id: productId, user_id: user.id, status: "pending" },
      { onConflict: "product_id,user_id" },
    );
    if (error) {
      toast.error("Não foi possível solicitar agora.");
      return;
    }
    setJustRequested((p) => [...p, productId]);
    toast.success("Solicitação de acesso enviada!");
  }, [tenant.id, requestedIds, justRequested]);
  const { data: tenantFooter } = useQuery({
    queryKey: ["portal-tenant-footer", tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("tenant_settings(social_links, icon_name, icon_color, icon_url)")
        .eq("id", tenant.id)
        .maybeSingle();

      if (error) {
        return null;
      }

      return data as {
        tenant_settings?: {
          social_links?: Record<string, string> | null;
          icon_name?: string | null;
          icon_color?: string | null;
          icon_url?: string | null;
        } | null;
      } | null;
    },
    enabled: !!tenant.id,
  });

  const ownedProducts = useMemo(() => products.filter((p) => p.hasAccess), [products]);
  const lockedProducts = useMemo(() => products.filter((p) => !p.hasAccess), [products]);

  const galleryItems = useMemo(
    () =>
      ownedProducts.map((product) => {
        const imageSrc =
          (product.coverUrl
            ? getCoversOptimizedUrl(product.coverUrl, "product-card", product.updatedAt)
            : null) || PORTAL_PRODUCT_FALLBACK;

        return {
          id: product.id,
          title: product.name,
          description: product.description ||
            (product.benefit === "courses"
              ? t("portal.home.fallbackShowcaseDescription")
              : product.benefit === "files"
              ? t("portal.home.fallbackFilesDescription")
              : product.benefit === "links"
              ? t("portal.home.fallbackLinksDescription")
              : ""),
          badge: product.benefit === "courses"
            ? t("products.deliverableTypes.course")
            : product.benefit === "files"
            ? t("products.deliverableTypes.file")
            : product.benefit === "links"
            ? t("products.deliverableTypes.link")
            : null,
          badgeVariant: product.benefit === "courses"
            ? "blue"
            : product.benefit === "files"
            ? "purple"
            : product.benefit === "links"
            ? "green"
            : undefined,
          imageSrc,
          onClick: () => {
            if (product.benefit === "courses" && product.courseSlug) {
              navigate(`/${slug}/${product.courseSlug}`);
            } else {
              navigate(`/${slug}/products/${product.public_id}`);
            }
          },
        };
      }),
    [ownedProducts, t, navigate, slug]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate(`/${slug}/login`, { replace: true });
  }, [signOut, navigate, slug]);

  // ── Skin "netflix" (galeria estilo Netflix) ──
  // Seleção: ?skin=netflix (preview) ou tenant.portal_products_template.
  const skin = searchParams.get("skin") || tenant.portal_products_template;
  const isNetflix = skin === "netflix";

  // Progresso por curso (só busca na skin netflix)
  const ownedCourseSlugs = useMemo(
    () =>
      isNetflix
        ? ownedProducts
            .filter((p) => p.benefit === "courses" && p.courseSlug)
            .map((p) => p.courseSlug as string)
        : [],
    [isNetflix, ownedProducts],
  );
  const { data: progressMap = {} } = usePortalCoursesProgress(
    tenant.id,
    ownedCourseSlugs,
    user?.id,
  );

  const netflix = useMemo(() => {
    const coverOf = (p: (typeof products)[number]) =>
      p.coverUrl ? getCoversOptimizedUrl(p.coverUrl, "product-card", p.updatedAt) : null;
    const openOf = (p: (typeof products)[number]) => () => {
      if (p.benefit === "courses" && p.courseSlug) navigate(`/${slug}/${p.courseSlug}`);
      else navigate(`/${slug}/products/${p.public_id}`);
    };
    const progressOf = (p: (typeof products)[number]) =>
      p.courseSlug ? progressMap[p.courseSlug] : undefined;
    const toCard = (p: (typeof products)[number]): GalleryCourse => {
      const pr = progressOf(p);
      return {
        id: p.id,
        title: p.name,
        description: p.description,
        coverUrl: coverOf(p),
        onClick: openOf(p),
        progress: pr ? pr.percent : undefined,
        lessonsLabel: pr && pr.total > 0 ? `${pr.completed}/${pr.total} aulas` : undefined,
        completed: pr ? pr.total > 0 && pr.percent >= 100 : false,
      };
    };
    const toLocked = (p: (typeof products)[number]): GalleryCourse => ({
      id: p.id,
      title: p.name,
      description: p.description,
      coverUrl: coverOf(p),
      locked: true,
      requested: requestedIds.includes(p.id) || justRequested.includes(p.id),
      onRequestAccess: () => requestAccess(p.id),
    });

    // "Continue assistindo": cursos em andamento (0 < % < 100), por última atividade
    const inProgress = ownedProducts
      .filter((p) => {
        const pr = progressOf(p);
        return pr && pr.total > 0 && pr.percent > 0 && pr.percent < 100;
      })
      .sort((a, b) =>
        (progressOf(b)?.lastActivity ?? "").localeCompare(progressOf(a)?.lastActivity ?? ""),
      );

    const featuredProduct = inProgress[0] ?? ownedProducts[0];
    const featured = featuredProduct ? toCard(featuredProduct) : null;

    const rows: GalleryRow[] = [
      ...(inProgress.length
        ? [{ key: "continue", label: "Continue assistindo", items: inProgress.map(toCard) }]
        : []),
      { key: "owned", label: "Seus cursos", items: ownedProducts.map(toCard) },
      ...(lockedProducts.length
        ? [{ key: "locked", label: "Disponíveis", items: lockedProducts.map(toLocked) }]
        : []),
    ];
    return { featured, rows };
  }, [ownedProducts, lockedProducts, navigate, slug, requestedIds, justRequested, requestAccess, progressMap]);

  const { theme: globalTheme } = useTheme();
  const portalTheme = globalTheme;
  const isDark = portalTheme === "dark";
  const themeColors = useMemo(() => getPortalThemeColors(isDark), [isDark]);
  const galleryRadiusClass =
    tenant.portal_button_style === "rectangular"
      ? "rounded-none"
      : tenant.portal_button_style === "pill"
        ? "rounded-[20px]"
        : "rounded-[8px]";

  if (skin === "netflix") {
    return (
      <NoryFlowGallery
        userName={(customer?.name ?? profile?.name) ?? undefined}
        tenantName={tenant.name}
        iconUrl={tenantFooter?.tenant_settings?.icon_url ?? tenant.icon_url}
        iconName={tenantFooter?.tenant_settings?.icon_name}
        iconColor={tenantFooter?.tenant_settings?.icon_color}
        accent={tenant.primary_color}
        loading={isLoading}
        featured={netflix.featured}
        rows={netflix.rows}
        onSignOut={handleSignOut}
        tenantSlug={slug}
        userId={profile?.id}
      />
    );
  }

  return (
    <main
      className="flex min-h-screen flex-col"
      style={{
        ...(isDark ? DARK_VARS : LIGHT_VARS),
        background: themeColors.bg,
      }}
    >
      <CustomerPortalHeader
        tenantName={tenant.name}
        tenantSlug={slug}
        tenantIconUrl={tenantFooter?.tenant_settings?.icon_url ?? tenant.icon_url}
        tenantIconName={tenantFooter?.tenant_settings?.icon_name}
        tenantIconColor={tenantFooter?.tenant_settings?.icon_color}
        onSignOut={handleSignOut}
        userId={profile?.id}
      />

      <section className="flex-1 px-4 pb-20 md:px-8 md:pb-24">
        <div className="mx-auto w-full max-w-[1200px] 3xl:max-w-[1600px]">
          {isLoading ? (
            <div
              className="flex min-h-[420px] w-full flex-col items-center justify-center gap-3"
              style={{ color: themeColors.textSecondary }}
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-7 animate-spin" aria-hidden="true" />
              <span className="text-sm">{t("common.loading", "Carregando…")}</span>
            </div>
          ) : (
            <ProductGallery01
              title={
                (customer?.name ?? profile?.name)
                  ? t("portal.home.titleWithName", { name: (customer?.name ?? profile?.name)!.split(" ")[0] })
                  : t("portal.home.title")
              }
              description={t("portal.home.subtitle")}
              descriptionColor={themeColors.textSecondary}
              items={galleryItems}
              emptyState={
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span
                    className="flex size-14 items-center justify-center rounded-2xl"
                    style={{ background: themeColors.cardBg, border: `1px solid ${themeColors.cardBorder}` }}
                    aria-hidden="true"
                  >
                    <Lock className="size-6" style={{ color: themeColors.textSecondary }} />
                  </span>
                  <p className="text-sm" style={{ color: themeColors.textSecondary }}>
                    {t("portal.home.empty")}
                  </p>
                </div>
              }
              radiusClass={galleryRadiusClass}
              themeMode={portalTheme}
            />
          )}

          {!isLoading && lockedProducts.length > 0 && (
            <div className="mt-14">
              <h2 className="mb-4 text-xl font-semibold" style={{ color: themeColors.text }}>
                Disponíveis
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lockedProducts.map((product) => {
                  const requested =
                    requestedIds.includes(product.id) || justRequested.includes(product.id);
                  const img =
                    (product.coverUrl
                      ? getCoversOptimizedUrl(product.coverUrl, "product-card", product.updatedAt)
                      : null) || PORTAL_PRODUCT_FALLBACK;
                  return (
                    <div
                      key={product.id}
                      className={`overflow-hidden border ${galleryRadiusClass}`}
                      style={{
                        background: themeColors.cardBg,
                        borderColor: themeColors.cardBorder,
                      }}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        <img src={img} alt={product.name} className="size-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                          <Lock className="size-8 text-white/85" aria-label={t("portal.products.locked", "Conteúdo bloqueado")} />
                        </div>
                      </div>
                      <div className="space-y-3 p-4">
                        <h3 className="font-semibold" style={{ color: themeColors.text }}>
                          {product.name}
                        </h3>
                        {requested ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-sm font-medium"
                            style={{ color: themeColors.textSecondary }}
                            aria-live="polite"
                          >
                            <Check className="size-4" aria-hidden="true" /> Solicitado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => requestAccess(product.id)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Lock className="size-3.5" aria-hidden="true" /> Solicitar acesso
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <TenantPublicFooter
        tenantName={tenant.name}
        socialLinks={tenantFooter?.tenant_settings?.social_links ?? null}
      />
    </main>
  );
}
