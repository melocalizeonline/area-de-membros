/**
 * Nory Adapter
 *
 * Valida x-nory-signature (HMAC) e normaliza o payload canônico da Nory
 * para NormalizedEvent. Espelha o hotmart.ts.
 */

import type { NormalizedEvent, ProviderAdapter } from "../types.ts";
import { createHmac } from "node:crypto";

/* ─── Tipos do payload Nory ────────────────────────────────── */

interface NoryPayload {
  version?: string;
  event?: string;
  order_id?: string;
  product_id?: string;
  product_sku?: string;
  product_name?: string;
  amount_cents?: number;
  currency?: string;
  payment_method?: string;
  is_subscription?: boolean;
  subscription_status?: "active" | "past_due" | "cancelled" | null;
  buyer?: { email?: string; name?: string; phone?: string; document?: string };
  created_at?: string;
  // Produto digital (Nory): de-para DIRETO para o produto desta área de membros
  // (campo "Conteúdo" escolhido no form da Nory via nory-catalog).
  members_product_id?: string;
  // Régua de acesso configurada na Nory.
  access?: {
    type?: "vitalicio" | "meses" | "dias";
    value?: number | null;
    trial_days?: number;
    cancel_policy?: "periodo" | "imediato";
  };
}

/* ─── Mapeamentos ──────────────────────────────────────────── */

const EVENT_MAP: Record<string, NormalizedEvent["eventType"]> = {
  "order.approved": "approved",
  "order.refunded": "refunded",
  "order.chargeback": "chargeback",
  "order.canceled": "cancelled",
  "subscription.renewed": "approved", // renovação = novo pagamento aprovado (mantém acesso)
  "subscription.past_due": "pending", // atraso → past_due (suspende via régua)
  "subscription.canceled": "cancelled", // cancelou → revoga
};

/* ─── Adapter ──────────────────────────────────────────────── */

export const noryAdapter: ProviderAdapter = {
  provider: "nory",

  validateAuth(
    request: Request,
    rawBody: string,
    _body: unknown,
    credentials: Record<string, string>,
  ): boolean {
    const header = request.headers.get("x-nory-signature") ?? "";
    const secret = credentials.secret ?? "";
    if (!header || !secret) return false;

    const parts = Object.fromEntries(
      header.split(",").map((kv) => kv.trim().split("=")).filter((a) => a.length === 2),
    ) as { t?: string; v1?: string };
    const ts = Number(parts.t);
    const sig = parts.v1 ?? "";
    if (!Number.isFinite(ts) || !sig) return false;
    // tolerância de 5 min contra replay
    if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;

    const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
    // comparação simples (constante o suficiente p/ hex de mesmo tamanho)
    return sig.length === expected.length && sig === expected;
  },

  normalizeEvent(body: unknown): NormalizedEvent | null {
    const p = body as NoryPayload;
    const eventType = EVENT_MAP[p?.event ?? ""];
    if (!eventType) return null;

    const isSub = !!p.is_subscription || (p.event ?? "").startsWith("subscription.");

    // De-para DIRETO: quando a Nory envia members_product_id (campo "Conteúdo"),
    // ele já é o products.id desta área de membros — o pipeline resolve direto,
    // sem o mapeamento manual. Ausente → cai no fluxo gateway_product_mappings
    // pelo product_id da Nory.
    const directProductId = p.members_product_id ? String(p.members_product_id) : undefined;

    // Régua de acesso (duração/trial). Ausente = vitalício.
    const access = p.access
      ? {
        type: p.access.type ?? "vitalicio",
        value: p.access.value ?? null,
        trialDays: Number(p.access.trial_days ?? 0),
      }
      : undefined;

    // Política de cancelamento de assinatura (default: natural = manter até o fim do ciclo).
    const cancelPolicy: "natural" | "immediate" =
      p.access?.cancel_policy === "imediato" ? "immediate" : "natural";

    return {
      eventType,
      externalOrderId: p.order_id ?? "",
      externalProductId: p.product_id ? String(p.product_id) : "",
      directProductId,
      buyer: {
        email: p.buyer?.email?.trim().toLowerCase() ?? "",
        name: p.buyer?.name?.trim() || p.buyer?.email?.trim().toLowerCase() || "",
        phone: p.buyer?.phone?.trim() || undefined,
        document: p.buyer?.document?.trim() || undefined,
      },
      amountCents: Number(p.amount_cents ?? 0),
      paymentMethod: p.payment_method ?? "nory",
      currency: p.currency ?? "BRL",
      isSubscription: isSub,
      subscriptionStatus: p.subscription_status ?? (isSub ? "active" : undefined),
      isOrderBump: false,
      parentExternalOrderId: undefined,
      orderCreatedAt: p.created_at || undefined,
      rawEvent: p.event ?? "",
      access,
      cancelPolicy,
    };
  },
};
