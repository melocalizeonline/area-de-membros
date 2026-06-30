/**
 * Product Resolver
 *
 * Resolve produto Nory Members a partir do ID externo do gateway
 * via tabela gateway_product_mappings.
 */

import type { AdminClient, ResolvedProduct } from "./types.ts";

export async function resolveProduct(
  admin: AdminClient,
  tenantId: string,
  provider: string,
  externalProductId: string,
): Promise<ResolvedProduct | null> {
  const { data: mapping } = await admin
    .from("gateway_product_mappings")
    .select("product_id, products(id, name, unit_amount)")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .eq("external_product_id", externalProductId)
    .not("product_id", "is", null)
    .maybeSingle();

  if (!mapping?.products) return null;

  const p = mapping.products as { id: string; name: string; unit_amount: number };
  return {
    id: p.id,
    name: p.name,
    unitAmount: p.unit_amount ?? 0,
  };
}

/**
 * Resolve produto por products.id DIRETO (de-para já feito pelo gateway, ex.: Nory
 * envia members_product_id). Valida que o produto pertence ao tenant — nunca
 * confia no id sem checar o tenant_id, senão um gateway poderia liberar produto
 * de outra área de membros.
 */
export async function resolveProductDirect(
  admin: AdminClient,
  tenantId: string,
  productId: string,
): Promise<ResolvedProduct | null> {
  if (!productId) return null;

  const { data: product } = await admin
    .from("products")
    .select("id, name, unit_amount")
    .eq("id", productId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!product) return null;

  const p = product as { id: string; name: string; unit_amount: number | null };
  return {
    id: p.id,
    name: p.name,
    unitAmount: p.unit_amount ?? 0,
  };
}
