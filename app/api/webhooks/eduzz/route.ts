import { NextResponse } from "next/server";
import { processPurchase, verifyWebhookSecret } from "@/lib/integrations/webhook";

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request, process.env.EDUZZ_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const normalized = {
    eventId: String(payload.id ?? payload.trans_id ?? ""),
    eventType: String(payload.event ?? payload.status ?? "purchase"),
    buyerEmail: String(payload.customer?.email ?? payload.cus_email ?? ""),
    buyerName: String(payload.customer?.name ?? payload.cus_name ?? "Novo membro"),
    externalProductId: String(payload.product?.id ?? payload.pro_id ?? payload.product_id ?? ""),
    externalOrderId: String(payload.order_id ?? payload.trans_id ?? ""),
    active: !["refunded", "chargeback", "canceled", "cancelled"].includes(
      String(payload.status ?? "").toLowerCase()
    ),
    payload
  };

  if (!normalized.buyerEmail || !normalized.externalProductId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await processPurchase("eduzz", normalized);
  return NextResponse.json(result);
}
