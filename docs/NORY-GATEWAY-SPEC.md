# Especificação da Integração Nory ↔ Área de Membros (gateway nível Cliente)

Este documento descreve o **contrato que a plataforma Nory precisa implementar** para
funcionar como gateway de pagamento da área de membros — igual ao Hotmart: o cliente
compra no Nory e o acesso é liberado automaticamente aqui.

> Fonte: derivado do código da área de membros (`supabase/functions/gateway-connect`,
> `gateway-webhook`, `nory-catalog`, `_shared/gateway/adapters/nory.ts`). É o "espelho"
> do `CHECKOUT-NORY-MEMBERS.md`. Se algo divergir, o código deste repo é a verdade.

Placeholders usados abaixo:
- `NORY_BASE` = `https://app.nory.com.br` (config. na área de membros via env `NORY_API_BASE_URL`).
- `MEMBERS_BASE` = URL do backend Supabase da área de membros, ex.: `https://<projeto>.supabase.co`.
- `<tenantId>` = UUID do tenant (workspace) na área de membros.

---

## 1. Visão geral do fluxo

```
Lojista (tenant) conecta Nory na área de membros
        │  cola a API key da conta Nory dele
        ▼
[Membros] POST NORY_BASE/api/public/v1/webhooks  ──►  [Nory] devolve { secret }
        │                                                     (registra a URL de callback do tenant)
        ▼
Cliente compra um produto no Nory
        │
        ▼
[Nory] POST MEMBERS_BASE/functions/v1/gateway-webhook/nory/<tenantId>
        │   header x-nory-signature (HMAC com o secret) + payload da venda
        ▼
[Membros] valida assinatura → libera/revoga acesso do cliente (por email) ao conteúdo
```

A Nory precisa implementar **3 coisas**:
1. **Endpoint de registro de webhook** (§3) — a área de membros chama.
2. **Envio dos webhooks de venda** assinados (§4, §5, §6) — a Nory chama a área de membros.
3. **(Opcional, recomendado) Consumir o catálogo de conteúdos** (§7) — pra o lojista escolher o que o produto libera.

---

## 2. Conexão (o que o lojista faz na área de membros)

No admin do tenant → **Apps e Integrações** → conectar **Nory** → cola a **API key** da conta Nory.
Ao salvar, a área de membros chama o endpoint do §3 usando essa API key, recebe o `secret`
e o guarda (cofre, service-role only). O `secret` é o que assina/valida todos os webhooks e
o catálogo. **Só o secret é necessário depois** — a API key só serve pra registrar o webhook.

---

## 3. Endpoint que a NORY expõe: registro de webhook

A área de membros faz, no momento da conexão:

```
POST NORY_BASE/api/public/v1/webhooks
Authorization: Bearer <api_key_do_tenant>
Content-Type: application/json

{
  "url": "MEMBERS_BASE/functions/v1/gateway-webhook/nory/<tenantId>",
  "eventos": [
    "order.approved", "order.refunded", "order.chargeback", "order.canceled",
    "subscription.renewed", "subscription.past_due", "subscription.canceled"
  ]
}
```

**Resposta esperada (200):**
```json
{ "secret": "<string usada p/ assinar os webhooks deste tenant>" }
```

Requisitos:
- **Idempotente por (conta/tenant, url):** reconectar deve devolver **o mesmo** endpoint + secret, sem duplicar.
- `401`/`403` → a área de membros trata como "chave de API inválida".
- Se não retornar `secret`, a conexão falha (`nory_register_failed`).

---

## 4. Endpoint que a MEMBROS expõe: webhook de venda

A Nory envia, a cada evento financeiro:

```
POST MEMBERS_BASE/functions/v1/gateway-webhook/nory/<tenantId>
Content-Type: application/json
x-nory-signature: t=<unix_ts>,v1=<hmac_hex>

<corpo JSON — ver §6>
```

Respostas:
- `200` — processado (ou ignorado se o `event` não for um dos suportados).
- `401` — assinatura inválida / tenant desconectado.
- `404` — integração Nory não encontrada para o `<tenantId>`.
- `500` — falha ao processar (a Nory pode **reenviar**; o processamento é idempotente — §8).

---

## 5. Assinatura HMAC (obrigatória)

Mesma para o webhook (§4) e o catálogo (§7).

- Header: `x-nory-signature: t=<unix_ts>,v1=<hmac_hex>`
  - `t` = timestamp Unix **em segundos**.
  - `v1` = `HMAC_SHA256(secret, "<t>.<corpo_cru>")` em **hex minúsculo**.
- **A string assinada é `"<t>.<corpo>"`** — o `t`, um ponto literal, e o corpo **exatamente como enviado** (mesmos bytes que vão no body; no GET do catálogo o corpo é vazio → assina `"<t>."`).
- **Janela anti-replay: ±300 segundos.** Fora disso é rejeitado.

Exemplo (pseudocódigo):
```
ts   = 1751299200
body = '{"event":"order.approved",...}'
sig  = hmac_sha256_hex(secret, ts + "." + body)
header = "t=" + ts + ",v1=" + sig
```

---

## 6. Payload do webhook

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `event` | string | sim | Um dos 7 eventos suportados (§7). Evento desconhecido → ignorado (200). |
| `order_id` | string | sim | ID do pedido na Nory. **Idempotência** é por este id (§8). |
| `product_id` | string | sim* | ID do produto na Nory (fallback de de-para se não houver `members_product_id`). |
| `members_product_id` | string | recomendado | ID do produto **na área de membros** (do catálogo §7). Se presente, libera direto (sem mapeamento manual). |
| `product_sku` / `product_name` | string | não | Informativo. |
| `amount_cents` | int | não | Valor em centavos. |
| `currency` | string | não | Default `BRL`. |
| `payment_method` | string | não | Default `nory`. |
| `buyer.email` | string | **sim** | **É por este email que o acesso do cliente é concedido** (cria conta/magic link se preciso). |
| `buyer.name` | string | não | |
| `buyer.phone` / `buyer.document` | string | não | |
| `is_subscription` | bool | não | true para recorrência (ou `event` começa com `subscription.`). |
| `subscription_status` | `active`\|`past_due`\|`cancelled`\|null | não | |
| `access` | objeto | não | Régua de acesso (§9). Ausente = **vitalício**. |
| `created_at` | ISO string | não | Data do pedido (âncora da régua de acesso). |

**Exemplo — compra aprovada (produto vitalício):**
```json
{
  "event": "order.approved",
  "order_id": "NORY-ord_123",
  "product_id": "nory_prod_99",
  "members_product_id": "8f3c1e20-....-products.id-da-area-de-membros",
  "product_name": "Curso X",
  "amount_cents": 19700,
  "currency": "BRL",
  "payment_method": "pix",
  "buyer": { "email": "cliente@email.com", "name": "Cliente", "phone": "+55...", "document": "..." },
  "created_at": "2026-06-30T12:00:00Z"
}
```

**Exemplo — assinatura com régua de 12 meses + 7 dias de trial:**
```json
{
  "event": "order.approved",
  "order_id": "NORY-sub_456",
  "members_product_id": "8f3c1e20-....",
  "buyer": { "email": "cliente@email.com", "name": "Cliente" },
  "is_subscription": true,
  "subscription_status": "active",
  "access": { "type": "meses", "value": 12, "trial_days": 7 },
  "created_at": "2026-06-30T12:00:00Z"
}
```

---

## 7. Eventos suportados e efeito

| `event` | Efeito na área de membros |
|---|---|
| `order.approved` | **Concede** acesso ao conteúdo (respeitando a régua). |
| `subscription.renewed` | Tratado como pagamento aprovado — **mantém** o acesso. |
| `order.refunded` | **Revoga** acesso. |
| `order.chargeback` | **Revoga** acesso. |
| `order.canceled` | **Revoga** acesso. |
| `subscription.canceled` | **Revoga** acesso. |
| `subscription.past_due` | Marca atraso (`past_due`). |
| *(qualquer outro)* | Ignorado (HTTP 200, sem efeito). |

Revogações protegem cursos que o cliente ainda tenha por **outro** pedido ativo.

---

## 8. De-para de produto (o que o cliente recebe)

Duas formas, em ordem de preferência:

1. **Direto (`members_product_id`)** — recomendado. No formulário do produto no Nory, o
   lojista escolhe o "Conteúdo" a liberar. Pra popular essa lista, a Nory chama o catálogo:

   ```
   GET MEMBERS_BASE/functions/v1/nory-catalog/<tenantId>
   x-nory-signature: t=<ts>,v1=<hmac(secret,"<ts>.")>   (corpo vazio)
   ```
   **Resposta (200):**
   ```json
   { "items": [ { "id": "<products.id>", "nome": "Curso X", "slug": "curso-x", "tipo": "courses", "ativo": true } ] }
   ```
   A Nory guarda o `id` escolhido e o devolve em cada webhook como `members_product_id`.

2. **Fallback por `product_id`** — se o webhook **não** trouxer `members_product_id`, a área
   de membros resolve pelo `product_id` da Nory via um **mapeamento manual** que o lojista
   configura na aba de mapeamento da integração. (Mais trabalhoso — prefira a forma 1.)

---

## 9. Régua de acesso (`access`)

Define a duração do acesso concedido. Ausente = vitalício.

| Campo | Valores | Significado |
|---|---|---|
| `type` | `vitalicio` \| `meses` \| `dias` | Tipo de duração. |
| `value` | int \| null | Quantidade de meses/dias (ignorado em `vitalicio`). |
| `trial_days` | int | Dias de trial somados ao início. |
| `cancel_policy` | `periodo` \| `imediato` | Só p/ assinatura: `imediato` revoga **todos** os pedidos da assinatura no `subscription.canceled`; `periodo` (default) deixa expirar no fim do ciclo pago. |

A área de membros calcula a expiração a partir de `created_at` (âncora) + trial + duração.
Renovações estendem (nunca encurtam) o acesso.

---

## 10. Idempotência e reenvio

- A idempotência é por **`order_id`** (chave única por tenant+provider+order_id). Reenviar
  o mesmo evento não duplica acesso — é seguro a Nory **reenviar** em caso de `5xx`/timeout.
- Progressão de status é respeitada (ex.: `approved` → `completed`).
- **Renovações de assinatura usam `order_id` distinto por cobrança**: o evento
  `subscription.renewed` carrega o formato `<orcamentoId>:<itemId>:<chargeId>` (sufixo com
  o id da cobrança), enquanto `order.approved`/`past_due`/`canceled` usam `<orcamentoId>:<itemId>`.
  Cada renovação vira um novo pedido no membros e **estende** a régua de acesso.

---

## 11. Checklist de implementação (lado Nory)

- [ ] Endpoint `POST /api/public/v1/webhooks` (Bearer api_key) → `{ secret }`, idempotente por (conta, url).
- [ ] Ao vender, enviar `POST` pra URL registrada com header `x-nory-signature` (HMAC §5) e payload §6.
- [ ] Assinar com o **mesmo secret** devolvido no registro; usar `"<ts>.<corpo>"`; ts em segundos; janela 300s.
- [ ] Consumir `GET /nory-catalog/<tenantId>` (assinado) pra listar conteúdos e guardar o `members_product_id` escolhido.
- [ ] Devolver `members_product_id` + (opcional) `access` em cada webhook.
- [ ] Reenviar em `5xx`/timeout; usar `order_id` único por cobrança (renovação = novo id).

---

## 12. Troubleshooting (sintoma → causa provável)

| Sintoma | Causa provável |
|---|---|
| Conexão falha com `nory_register_failed` | Endpoint `/api/public/v1/webhooks` não existe / não devolve `secret` / API key inválida. |
| Webhook retorna `401` | HMAC errado (string assinada não é `"<ts>.<corpo>"`, ts fora da janela de 300s, ou secret diferente do registrado). |
| Webhook retorna `404` | `<tenantId>` errado na URL, ou tenant sem integração Nory conectada. |
| Compra aprovada mas acesso não libera | `members_product_id` ausente **e** sem mapeamento manual do `product_id`; ou `buyer.email` vazio/errado. |
| Catálogo retorna `401` | Assinatura do GET inválida (lembre: corpo vazio → assina `"<ts>."`). |
| Acesso expira cedo/tarde | Régua `access` divergente do esperado, ou `created_at` ausente. |
