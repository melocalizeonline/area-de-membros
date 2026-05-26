import { NextResponse } from "next/server";
import { processPurchase, verifyWebhookSecret } from "@/lib/integrations/webhook";

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request, process.env.KIWIFY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const normalized = {
    eventId: String(payload.id ?? payload.event_id ?? ""),
    eventType: String(payload.event ?? payload.status ?? "purchase"),
    buyerEmail: String(payload.customer?.email ?? payload.buyer?.email ?? ""),
    buyerName: String(payload.customer?.name ?? payload.buyer?.name ?? "Novo membro"),
    externalProductId: String(payload.product?.id ?? payload.product_id ?? ""),
    externalOrderId: String(payload.order_id ?? payload.sale_id ?? ""),
    active: !["refunded", "chargeback", "canceled", "cancelled"].includes(
      String(payload.status ?? "").toLowerCase()
    ),
    payload
  };

  if (!normalized.buyerEmail || !normalized.externalProductId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await processPurchase("kiwify", normalized);
  return NextResponse.json(result);
}
