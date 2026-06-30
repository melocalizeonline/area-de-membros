<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/brand/logo-nory-light.png">
    <source media="(prefers-color-scheme: light)" srcset="./public/brand/logo-nory-dark.png">
    <img src="./public/brand/logo-nory-dark.png" alt="Nory Members" width="180">
  </picture>

  <br/>
  <br/>

  **Nory Members — plataforma de área de membros e produtos digitais.**

  <br/>

  Multi-tenant · Cursos · Checkout nativo (Nory) · Hospedagem de vídeo · Hospedagem de sites · Superadmin

</div>

---

## Sobre

**Nory Members** é a plataforma de área de membros da Nory: cada cliente (tenant) cria sua própria área de membros para vender e entregar cursos online, produtos digitais e conteúdo de assinatura — com checkout, hospedagem de vídeo, domínios e personalização visual, tudo isolado por tenant via RLS do Supabase.

O código tem como base o **Hubfy Lite** (licença obtida pela Nory) e é mantido neste repositório privado, conectado ao projeto **Supabase do Nory Members**. Não é um produto open-source para redistribuição — ver [Licença](#licença).

> **Repositório:** `melocalizeonline/area-de-membros` · **Projeto Supabase:** `appcwchnbmfndgvusxtb`

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Edge Functions | Deno (TypeScript) |
| Hospedagem de vídeo | Gumlet (padrão) |
| Estado | TanStack Query v5 |
| Formulários | React Hook Form + Zod |
| Rich text | BlockNote |
| i18n | i18next (pt-BR · en · es) |
| Observabilidade | Sentry |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) 2.x
- [Docker](https://www.docker.com/) (apenas para o stack Supabase local)
- Acesso ao projeto Supabase `appcwchnbmfndgvusxtb` (para operar contra o ambiente real)

---

## Desenvolvimento local

```bash
git clone https://github.com/melocalizeonline/area-de-membros.git
cd area-de-membros
npm install
cp .env.example .env.local   # preencha as variáveis (ver abaixo)
npm run dev                  # http://localhost:8784
```

Há dois caminhos para o backend durante o desenvolvimento:

### Opção A — Stack Supabase local (Docker)

Sobe um Postgres + Auth + Storage + Edge Runtime locais e aplica **todas** as migrations do zero. Ideal para testar migrations sem tocar produção.

```bash
supabase start          # sobe o stack (1ª vez baixa imagens)
supabase db reset       # reaplica todas as migrations num banco limpo
supabase stop           # derruba o stack
```

Portas locais: API `54321` · DB `54322` · Studio `54323` · Mailpit `54324`. Aponte o `.env.local` para a API local (`VITE_SUPABASE_URL=http://127.0.0.1:54321`) e use as chaves impressas pelo `supabase start`.

### Opção B — Projeto Supabase remoto

Aponte o `.env.local` para o projeto real e use a CLI com o `--project-ref`:

```bash
supabase login
supabase link --project-ref appcwchnbmfndgvusxtb
```

> ⚠️ **Não rode `supabase db push` direto na produção.** Migrations vão para produção **via CI** (push na `main`) — ver [Deploy](#deploy).

---

## Variáveis de ambiente

Crie `.env.local` a partir de `.env.example`:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | ✅ | URL do projeto Supabase (`https://<ref>.supabase.co` ou `http://127.0.0.1:54321` no local) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Chave pública/anon do Supabase |
| `VITE_PUBLIC_SITE_URL` | ✅ | URL pública do deploy (ex.: `https://app.norymembers.com`) |
| `SUPABASE_PROJECT_ID` | Dev | Project ref — usado por `npm run gen:types` |

### Edge Function Secrets

Definidas no Supabase (**Project Settings → Edge Functions → Secrets**) ou via `supabase secrets set KEY=value`.

**Essenciais:**

| Secret | Obrigatória | Descrição |
|--------|-------------|-----------|
| `PUBLIC_SITE_URL` | ✅ | URL pública (espelha `VITE_PUBLIC_SITE_URL`) — usada nos links de email |
| `EMAIL_FROM_ADDRESS` | ✅ | Remetente dos emails transacionais |
| `RESEND_API_KEY` | ✅ | Chave do [Resend](https://resend.com) para envio de email |

**Hospedagem de vídeo (Gumlet):**

| Secret | Descrição |
|--------|-----------|
| `GUMLET_API_KEY` | Habilita upload, transcodificação e player protegido nativos para todos os tenants |

**Gateways de pagamento:**

| Secret | Descrição |
|--------|-----------|
| `NORY_API_BASE_URL` | Base da API da Nory (opcional — default `https://app.nory.com.br`) |
| `HOTMART_CLIENT_ID` / `HOTMART_CLIENT_SECRET` / `HOTMART_WEBHOOK_TOKEN` | Credenciais Hotmart |

**Integrações de vídeo externas** (só se conectadas em **Admin → Apps e Integrações**):

| Secret | Provedor |
|--------|----------|
| `VIMEO_CLIENT_ID` / `VIMEO_CLIENT_SECRET` / `VIMEO_ACCESS_TOKEN` | Vimeo |
| `PANDAVIDEO_API_KEY` | Panda Video |
| `WISTIA_API_KEY` | Wistia |

> A chave da API da Hostinger (módulo de hospedagem) **não** é um secret de ambiente — é cadastrada pelo Superadmin e fica em `platform_integrations` (service-role only).

---

## Funcionalidades

- 🎓 **Cursos online** — módulos e aulas com rastreamento de progresso
- 📦 **Produtos digitais** — venda de arquivos, recursos e acesso por assinatura
- 👥 **Portal do aluno** — área do cliente com a marca do tenant
- 🎨 **Personalização visual** — cores, logo, aparência do portal e do player
- 🎬 **Hospedagem de vídeo** — [Gumlet](https://www.gumlet.com/) nativo (upload, transcodificação, player protegido, legendas automáticas Pro)
- 🔗 **Integrações de vídeo** — Vimeo, Panda Video, Wistia, Smart Player, YouTube
- 💳 **Gateways de pagamento** — **Nory** (checkout nativo) e **Hotmart**, via webhooks
- ⏳ **Régua de acesso** — acesso vitalício, por N meses/dias ou com trial (gateways que entregam produto digital)
- 🧑‍🎓 **Matrícula manual** — liberar acesso sem checkout (toggle por tenant)
- 🔐 **Autenticação do aluno** — senha, Google e magic link + reset de senha pelo admin
- 🌐 **Apps e Integrações** — hub de integrações + **módulo de Hospedagem e Emails** (Hostinger): domínios, DNS, WordPress
- 🍿 **Skin Nory Flow** — tema estilo Netflix para o portal (galeria, curso e aula), ativável por tenant
- 🤖 **Geração de conteúdo com IA** — Anthropic e OpenAI
- 📊 **Dashboard & pedidos** — KPIs de receita, vendas recentes, gestão de pedidos
- 🌍 **Internacionalização** — pt-BR, en, es
- 👨‍💼 **Equipe** — convidar colaboradores com papéis (roles)
- 🔒 **Row-level security** — isolamento multi-tenant completo via RLS
- 🛡️ **Superadmin** — visão e operação cross-tenant para a Nory

---

## Gateways de pagamento

A arquitetura de gateways é universal: cada provedor implementa um **adapter** (`supabase/functions/_shared/gateway/adapters/`) que valida o webhook e normaliza o evento; o **pipeline** comum cria pedido, resolve cliente, materializa acesso e dispara email.

- **Nory** (checkout nativo): o tenant conecta colando a chave de API; o `gateway-connect` registra o webhook na Nory e guarda o `secret` HMAC. A Nory pode escolher o "Conteúdo" desta área de membros via `nory-catalog`, com **de-para direto** (`members_product_id`) e **régua de acesso** (vitalício/meses/dias + trial).
- **Hotmart**: webhook por evento, mapeamento de produtos em **Integrações → Mapeamento**.

URL de webhook (genérica por provedor/tenant):

```
https://<ref>.supabase.co/functions/v1/gateway-webhook/<provider>/<tenantId>
```

---

## Skin Nory Flow

Tema dark estilo Netflix para o portal do aluno (galeria + curso + aula). Ativação:

- **Preview:** `?skin=netflix` na URL.
- **Por tenant:** **Admin → Design → Portal** → template **Netflix** (campo `tenant_settings.portal_products_template`).

---

## Superadmin

Painel em `/superadmin/dashboard` para a operação Nory: métricas cross-tenant, lista de tenants, clientes, pedidos, produtos, sellers, logs de gateway e o módulo de **Hospedagem** (Hostinger).

Acesso de Superadmin **não** é automático — atribua o papel `admin` manualmente:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<user-uuid>', 'admin')
ON CONFLICT DO NOTHING;
```

> `'admin'` = superadmin (operação Nory). Donos de tenant usam papéis de workspace e só veem seus próprios dados.

---

## Deploy

### Backend (Supabase) — automático via CI

O workflow [`.github/workflows/supabase-deploy.yml`](.github/workflows/supabase-deploy.yml) roda a cada **push na `main`** que toque `supabase/migrations/**`, `supabase/functions/**` ou `supabase/config.toml`:

1. `supabase link --project-ref appcwchnbmfndgvusxtb`
2. `supabase db push` (aplica migrations pendentes)
3. `supabase functions deploy --use-api` (publica edge functions)

Secrets do repositório necessários: `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`. Também dá para disparar manualmente (`workflow_dispatch`).

### Frontend

Build estático servível em qualquer host (Vercel/Netlify/Cloudflare Pages):

```bash
npm run build   # gera dist/
```

Configure no host as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_PUBLIC_SITE_URL`. Os **secrets de edge function** ficam no Supabase, não no host do frontend.

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server em `http://localhost:8784` |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build local |
| `npm run typecheck` | Checagem de tipos (TypeScript) |
| `npm run lint` | ESLint |
| `npm run test` | Testes unitários (Vitest) |
| `npm run gen:types` | Regenera os tipos do Supabase |

---

## Estrutura do projeto

```
area-de-membros/
├── src/
│   ├── components/        # Componentes de UI (admin, portal, design, NoryFlow…)
│   ├── contexts/          # Contexts (Auth, etc.)
│   ├── hooks/             # Hooks customizados
│   ├── i18n/locales/      # Traduções (pt-BR, en, es)
│   ├── integrations/      # Cliente Supabase + tipos gerados
│   ├── lib/               # Utilitários e helpers
│   └── pages/
│       ├── admin/         # Painel do tenant
│       ├── portal/        # Portal do aluno
│       ├── course/        # Player de curso/aula
│       └── superadmin/    # Painel Superadmin (cross-tenant)
├── supabase/
│   ├── functions/         # Edge functions (Deno) — gateways, hosting, vídeo…
│   │   └── _shared/gateway # Arquitetura universal de gateways (adapters + pipeline)
│   ├── migrations/        # Migrations do banco
│   └── config.toml        # Config da CLI do Supabase
├── docs/                  # Roadmaps (comercialização, Superadmin)
└── public/                # Assets estáticos (brand Nory)
```

---

## Licença

Software **proprietário / interno** da Nory. Construído sobre uma cópia **licenciada** do Hubfy Lite (originalmente Business Source License 1.1) — ver [`LICENSE`](./LICENSE). Todos os direitos de operação e comercialização da plataforma Nory Members pertencem à Nory/melocalize. Não redistribuir nem publicar sem autorização.

---

## Marca

"Nory" e "Nory Members" são marcas da Nory. O uso do nome, logo ou identidade visual para representar ou comercializar produtos/serviços requer autorização prévia por escrito.
