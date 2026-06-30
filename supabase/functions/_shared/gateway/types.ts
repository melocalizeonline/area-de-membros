/**
 * Universal Gateway Architecture — Types
 *
 * Contratos compartilhados entre adapters, pipeline e router.
 * Cada gateway implementa ProviderAdapter (~100-150 linhas).
 * A lógica de negócio fica 100% no pipeline.
 */

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* ─── Event types normalizados ────────────────────────────── */

export type GatewayEventType =
  | "approved"
  | "completed"
  | "cancelled"
  | "refunded"
  | "chargeback"
  | "disputed"
  | "pending";

/**
 * Eventos processados mesmo com gateway inativo (auto-desativado).
 * Protege vendas antigas: se tenant trocou de Hotmart pra Kiwify,
 * refunds da Hotmart ainda devem revogar acesso.
 */
export const REVOCATION_EVENTS: GatewayEventType[] = [
  "cancelled",
  "refunded",
  "chargeback",
  "disputed",
];

/* ─── Evento normalizado (contrato adapter → pipeline) ──── */

export interface NormalizedBuyer {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  document?: string;
  documentType?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
    zipcode?: string;
  };
}

/**
 * Régua de duração do acesso (gateways que entregam produto digital com
 * tempo de acesso — ex.: Nory). Ausente no evento = acesso vitalício.
 *   - type "vitalicio": sem expiração (value ignorado)
 *   - type "meses"/"dias": expira em `value` meses/dias após a compra
 *   - trialDays: período de cortesia somado ao início (0 = sem trial)
 */
export interface AccessRule {
  type: "vitalicio" | "meses" | "dias";
  value: number | null;
  trialDays: number;
}

export interface NormalizedEvent {
  eventType: GatewayEventType;
  externalOrderId: string;
  externalProductId: string;
  /**
   * Quando presente, o produto desta área de membros já vem resolvido pelo
   * gateway (products.id direto) — o pipeline pula o gateway_product_mappings.
   */
  directProductId?: string;
  buyer: NormalizedBuyer;
  amountCents: number;
  paymentMethod: string;
  currency: string;
  isSubscription: boolean;
  subscriptionStatus?: "active" | "past_due" | "cancelled";
  isOrderBump: boolean;
  parentExternalOrderId?: string;
  orderCreatedAt?: string; // ISO timestamp
  rawEvent: string; // nome original do evento (ex: "PURCHASE_APPROVED")
  /** Régua de duração do acesso. Ausente = vitalício. */
  access?: AccessRule;
}

/* ─── Interface do adapter (1 por gateway) ────────────────── */

export interface ProviderAdapter {
  provider: string;

  /**
   * Valida autenticação do webhook.
   * @param request - Request original (para ler headers)
   * @param rawBody - String exata do body (necessário para HMAC)
   * @param body - JSON parseado (conveniência)
   * @param credentials - Secrets da tenant_integration_secrets
   */
  validateAuth(
    request: Request,
    rawBody: string,
    body: unknown,
    credentials: Record<string, string>,
  ): boolean;

  /**
   * Normaliza o payload para o formato comum.
   * Retorna null se o evento é desconhecido (será ignorado).
   */
  normalizeEvent(body: unknown): NormalizedEvent | null;
}

/* ─── Contexto do pipeline ────────────────────────────────── */

export interface PipelineContext {
  tenantId: string;
  integrationId: string;
  provider: string;
  event: NormalizedEvent;
  rawPayload: unknown;
}

export interface PipelineResult {
  status: "processed" | "duplicate" | "ignored" | "failed";
  orderId?: string;
  customerId?: string;
  error?: string;
  action?: string;
}

/* ─── Tipos de suporte ────────────────────────────────────── */

export type AdminClient = SupabaseClient;

export interface ResolvedProduct {
  id: string;
  name: string;
  unitAmount: number;
}
