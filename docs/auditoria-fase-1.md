# Auditoria Fase 1

Data: 2026-05-26

## Stack atual

- Next.js 16.2.6 com App Router e `proxy.ts`.
- React 19.
- Supabase Auth, Database e SSR client.
- Vercel/GitHub.
- Tailwind CSS 4 via PostCSS.
- Sem biblioteca de forms, validação ou UI pesada.

## Estrutura atual

- `app/login`: login com Supabase.
- `app/auth/callback`: troca code por sessão e garante perfil.
- `app/dashboard`: área do membro.
- `app/dashboard/cursos`: lista de cursos liberados.
- `app/dashboard/cursos/[slug]`: detalhe do curso com módulos e aulas.
- `app/dashboard/ferramentas`: lista de ferramentas liberadas.
- `app/dashboard/ferramentas/[slug]`: placeholder de ferramenta interna.
- `app/admin`: dashboard administrativo.
- `app/admin/membros`: convite e liberação manual de produtos.
- `app/admin/produtos`: criação/listagem de produtos.
- `app/admin/cursos`: criação de cursos, módulos e aulas.
- `app/admin/ferramentas`: criação/listagem de ferramentas.
- `app/admin/integracoes`: mapeamento de produtos externos para internos.
- `app/api/webhooks/kiwify` e `app/api/webhooks/eduzz`: endpoints iniciais.
- `components`: layout, sidebar, cards e componentes UI simples.
- `lib/supabase`: clientes Supabase anon e service role.
- `lib/integrations/webhook.ts`: processamento inicial de webhook.
- `supabase/schema.sql`: schema inicial com RLS.
- `types/database.ts`: tipos manuais do banco.

## Modelo de dados atual

- `profiles`: perfil do usuário, admin e status ativo.
- `products`: produto interno que controla acesso.
- `member_products`: vínculo membro-produto.
- `courses`: curso vinculado a um produto.
- `course_modules`: módulos de curso.
- `lessons`: aulas.
- `tools`: ferramentas vinculadas a um produto.
- `integration_mappings`: mapeia plataforma externa para produto interno.
- `webhook_events`: registra eventos recebidos.
- `lesson_progress`: estrutura inicial de progresso.

## O que já existe

- Login funcionando com Supabase.
- Proteção de `/dashboard` e `/admin`.
- Admin guard em layout.
- Dashboard do membro com cards e aula em destaque.
- Cursos, módulos e aulas com listagem.
- Ferramentas internas e externas.
- Admin funcional básico para criar produtos, membros, cursos, módulos, aulas e ferramentas.
- Mapeamento básico de integração.
- Webhooks iniciais com segredo via env.
- RLS habilitado nas tabelas principais.

## O que falta

- Página individual de aula.
- Player de vídeo por provider.
- Progresso real e botão marcar como concluída.
- Materiais.
- Favoritos.
- Certificados.
- Suporte.
- Minha conta funcional.
- Busca.
- Edição/exclusão no admin.
- Remoção/revogação de acesso.
- Detalhe de membro/produto/curso.
- Logs administrativos de webhook.
- Idempotência real nos webhooks.
- Tratamento específico de compra aprovada, reembolso, chargeback, cancelamento e expiração.
- Upload/cadastro de capas.
- Relação muitos-para-muitos entre produtos e cursos/ferramentas/materiais.

## Riscos técnicos

- `member_products` usa boolean `active`, mas o produto pede status mais rico como `expired`, `refunded`, `cancelled` e `manual_revoked`.
- Cursos e ferramentas estão vinculados a um único `product_id`, limitando pacotes mais flexíveis.
- Webhooks registram evento bruto, mas ainda não têm chave de idempotência única nem resultado/erro persistido.
- `inviteUserByEmail` no webhook pode não ser ideal para comprador recorrente ou usuário já existente.
- Admin usa service role corretamente no servidor, mas ações ainda precisam de validações mais fortes de payload.
- Tipos do banco são manuais e podem divergir do schema.
- Há função `member_accessible_product_ids` tipada mas não definida no schema.
- Página de curso lista aulas, mas não bloqueia por aula individual porque essa rota ainda não existe.
- `AppShell` ainda mistura navegação de membro e admin em um único componente.

## Plano em fases

1. Auditoria e documentação do estado atual.
2. Arquitetura de navegação/layouts e páginas base faltantes.
3. Página individual de aula com player seguro.
4. Progresso de aulas e continuar assistindo real.
5. Materiais e favoritos.
6. Certificados, suporte e minha conta.
7. Melhorias de admin: edição, exclusão, detalhes e revogação de acesso.
8. Evolução controlada do modelo de produtos/acessos com migrations planejadas.
9. Webhooks idempotentes e adaptadores Kiwify/Eduzz.
10. Revisão visual, segurança e deploy.

## Escopo aprovado agora

- Executar Fase 1 e Fase 2.
- Não implementar webhooks agora.
- Não alterar migrations/schema/RLS sem aprovação.
