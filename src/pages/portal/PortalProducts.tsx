import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShoppingBag, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerProducts } from "@/hooks/useCustomerProducts";
import { usePortal } from "@/contexts/PortalContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { getCoversOptimizedUrl } from "@/lib/storage-urls";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PORTAL_PRODUCT_FALLBACK = "/images/placeholders/product-portal-fallback.svg";

interface LockedProduct {
  id: string;
  name: string;
  cover_url: string | null;
  updated_at: string | null;
}

export default function PortalProducts() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant } = usePortal();
  const { data: products, isLoading } = useCustomerProducts();

  const ownedIds = new Set((products ?? []).map((p) => p.product_id));

  // Produtos "apenas ver" (locked) que o cliente NÃO possui
  const { data: lockedProducts = [] } = useQuery({
    queryKey: ["portal-locked-products", tenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, cover_url, updated_at")
        .eq("tenant_id", tenant.id)
        .eq("status", "active")
        .eq("portal_visibility", "locked");
      return (data ?? []) as LockedProduct[];
    },
  });

  const { data: requestedIds = [] } = useQuery({
    queryKey: ["portal-product-requests", tenant.id],
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

  const requestAccess = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Faça login para solicitar acesso.");
      return;
    }
    const { error } = await supabase.from("access_requests").upsert(
      { tenant_id: tenant.id, product_id: productId, user_id: user.id, status: "pending" },
      { onConflict: "product_id,user_id" },
    );
    if (error) {
      toast.error("Não foi possível enviar a solicitação agora.");
      return;
    }
    setJustRequested((p) => [...p, productId]);
    toast.success("Solicitação de acesso enviada!");
  };

  const availableLocked = lockedProducts.filter((p) => !ownedIds.has(p.id));

  return (
    <PortalLayout>
      <div className="space-y-8 px-4 pb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t("portal.products.title")}</h1>
          <p className="text-muted-foreground">{t("portal.products.subtitle")}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !products?.length && !availableLocked.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ShoppingBag className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t("portal.products.empty")}</p>
          </div>
        ) : (
          <>
            {!!products?.length && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card
                    key={product.product_id}
                    className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                    onClick={() => navigate(`/${slug}/portal/products/${product.product_id}`)}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      <img
                        src={
                          product.product_cover_url
                            ? getCoversOptimizedUrl(product.product_cover_url, "product-card", product.product_updated_at) || PORTAL_PRODUCT_FALLBACK
                            : PORTAL_PRODUCT_FALLBACK
                        }
                        alt={product.product_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-foreground line-clamp-2">{product.product_name}</h3>
                      {product.product_benefit && (
                        <Badge variant="secondary" className="capitalize">
                          {product.product_benefit === "files"
                            ? t("portal.products.benefitFiles")
                            : t("portal.products.benefitShowcase")}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {availableLocked.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Disponíveis</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableLocked.map((product) => {
                    const requested = requestedIds.includes(product.id) || justRequested.includes(product.id);
                    return (
                      <Card key={product.id} className="overflow-hidden opacity-90">
                        <div className="relative aspect-square w-full overflow-hidden bg-muted">
                          <img
                            src={
                              product.cover_url
                                ? getCoversOptimizedUrl(product.cover_url, "product-card", product.updated_at) || PORTAL_PRODUCT_FALLBACK
                                : PORTAL_PRODUCT_FALLBACK
                            }
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Lock className="size-7 text-white/80" />
                          </div>
                        </div>
                        <CardContent className="p-4 space-y-2">
                          <h3 className="font-semibold text-foreground line-clamp-2">{product.name}</h3>
                          {requested ? (
                            <div className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                              <Check className="size-4" /> Acesso solicitado
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => requestAccess(product.id)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                            >
                              <Lock className="size-3.5" /> Solicitar acesso
                            </button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
