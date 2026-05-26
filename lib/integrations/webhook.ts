import { createAdminClient } from "@/lib/supabase/server";
import type { IntegrationProvider } from "@/types/database";

export type NormalizedPurchase = {
  eventId?: string;
  eventType: string;
  buyerEmail: string;
  buyerName: string;
  externalProductId: string;
  externalOrderId?: string;
  active: boolean;
  payload: unknown;
};

export function verifyWebhookSecret(request: Request, expectedSecret: string | undefined) {
  if (!expectedSecret) return false;
  const received = request.headers.get("x-webhook-secret");
  return received === expectedSecret;
}

export async function processPurchase(provider: IntegrationProvider, purchase: NormalizedPurchase) {
  const supabase = await createAdminClient();

  await supabase.from("webhook_events").insert({
    provider,
    event_id: purchase.eventId ?? null,
    event_type: purchase.eventType,
    payload: purchase.payload as never
  });

  const { data: mapping } = await supabase
    .from("integration_mappings")
    .select("product_id")
    .eq("provider", provider)
    .eq("external_product_id", purchase.externalProductId)
    .eq("active", true)
    .single();

  if (!mapping) return { status: "ignored" as const };

  const { data: invited } = await supabase.auth.admin.inviteUserByEmail(purchase.buyerEmail, {
    data: { name: purchase.buyerName }
  });

  const userId = invited.user?.id;
  if (!userId) return { status: "user_not_created" as const };

  await supabase.from("profiles").upsert({
    id: userId,
    name: purchase.buyerName,
    email: purchase.buyerEmail,
    active: true
  });

  await supabase.from("member_products").upsert({
    member_id: userId,
    product_id: mapping.product_id,
    source: provider,
    external_order_id: purchase.externalOrderId ?? null,
    active: purchase.active
  });

  return { status: "processed" as const };
}
