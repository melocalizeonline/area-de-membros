# Implementacao Comercial da Plataforma

Este documento consolida o que falta para transformar o projeto em uma plataforma comercial operavel, vendavel e sustentavel como SaaS.

## Diagnostico Executivo

O projeto ja possui uma base relevante de area de membros: multi-tenancy, cursos, produtos digitais, area do aluno, pedidos, integracoes, hosting de video, configuracoes visuais, funcoes Supabase e painel Superadmin.

Mesmo assim, o produto ainda nao esta completamente pronto para operacao comercial. O principal gap nao e apenas adicionar mais features, mas criar a camada de controle da plataforma: planos, cobranca, status de tenants, permissoes comerciais, suporte operacional, auditoria, observabilidade e processos administrativos.

Antes de comercializar, tambem existe um ponto juridico importante: o README atual declara licenca BSL 1.1 e restringe uso comercial/SaaS/revenda ate 2032-01-01. A titularidade/licenca precisa ser validada antes de qualquer uso comercial.

## Objetivo Comercial

Construir uma plataforma SaaS de area de membros em que a operacao consiga:

- vender planos Free/Pro/Business ou equivalentes;
- criar, editar, pausar e cancelar tenants;
- cobrar clientes da propria plataforma usando a Nory como checkout padrao;
- aplicar limites e recursos por plano;
- dar suporte a clientes e alunos sem acessar banco de dados;
- auditar acoes administrativas;
- monitorar erros, pagamentos, webhooks, videos e acessos;
- operar com seguranca, compliance e previsibilidade.

## Principios de Implementacao

- Centralizar regras comerciais em uma camada unica de entitlements.
- Evitar features soltas ativadas apenas por checagens espalhadas de `plan`.
- Priorizar Superadmin, billing e status de tenant antes de novas integracoes.
- Toda acao critica precisa gerar audit log.
- Toda falha operacional precisa ser visivel e reprocessavel.
- Tenants inadimplentes, pausados ou bloqueados precisam ter enforcement real no sistema.

## Estado Atual Observado

### Ja Existe

- Multi-tenancy com tenant, usuarios e roles.
- Painel administrativo do tenant.
- Painel Superadmin com listagens globais.
- Cursos, modulos, aulas e area do aluno.
- Produtos digitais e pedidos.
- Integracoes funcionais com OpenAI, Anthropic, Hotmart, Nory, Vimeo, Panda Video e Wistia.
- Hosting de video com Gumlet.
- Player com legenda, protecao por token e tracking de progresso.
- Algumas regras por plano Pro/Business.
- Funcoes Supabase para fluxos criticos.
- Base de RLS e separacao por tenant.

### Ainda Insuficiente Para SaaS Comercial

- Planos comerciais nao sao configuraveis pelo Superadmin.
- Nao existe billing completo da propria plataforma.
- Superadmin ainda nao edita profundamente um tenant.
- Nao existe status comercial completo do tenant.
- Entitlements e limites por plano nao estao centralizados.
- Varias integracoes aparecem como indisponiveis ou placeholder.
- Falta suporte operacional para alunos, pedidos e acessos.
- Falta auditoria administrativa completa.
- Falta observabilidade operacional.
- Falta rotina forte de reconciliacao de webhooks/pagamentos.
- Falta cobertura de testes para fluxos comerciais criticos.

## Bloqueador Juridico/Comercial

O README atual indica licenca BSL 1.1 com restricao de uso comercial, SaaS, revenda e comercializacao ate 2032-01-01.

Antes de vender a plataforma, e necessario:

1. Confirmar quem detem os direitos do codigo.
2. Validar se a restricao do README se aplica ao produto atual.
3. Ajustar a licenca caso o projeto seja proprietario.
4. Remover ambiguidades que possam impedir venda, investimento ou parceria.

Sem essa validacao, existe risco de construir uma operacao comercial sobre uma base juridicamente restrita.

## Fase 0 - Fundacao Comercial

### 0.1 Definir Planos Oficiais

Criar uma tabela de planos da plataforma, por exemplo `platform_plans`.

Campos sugeridos:

- `id`
- `slug`
- `name`
- `description`
- `monthly_price`
- `yearly_price`
- `currency`
- `is_active`
- `features`
- `limits`
- `created_at`
- `updated_at`

Exemplo de `features`:

```json
{
  "ai_captions": true,
  "video_protection": true,
  "video_tracking": true,
  "custom_domain": true,
  "advanced_integrations": false
}
```

Exemplo de `limits`:

```json
{
  "max_members": 1000,
  "max_products": 50,
  "max_storage_gb": 100,
  "max_team_users": 5,
  "max_monthly_ai_minutes": 300
}
```

### 0.2 Criar Entitlement Resolver

Criar uma camada central para responder perguntas comerciais:

- tenant pode usar legenda por IA?
- tenant pode usar protecao de video?
- tenant pode cadastrar dominio proprio?
- tenant excedeu limite de alunos?
- tenant excedeu limite de storage?
- tenant pode ativar determinada integracao?

Essa camada deve ser usada por:

- frontend;
- Edge Functions;
- hooks;
- APIs;
- Superadmin;
- processos de upload e webhook.

### 0.3 Criar Status Comercial do Tenant

Adicionar estado comercial em `tenant_settings` ou tabela equivalente.

Status sugeridos:

- `trial`
- `active`
- `past_due`
- `paused`
- `cancelled`
- `blocked`

Esses estados devem ser aplicados em:

- login;
- painel admin;
- area do aluno;
- checkout;
- uploads;
- integracoes;
- Edge Functions;
- webhooks.

## Fase 1 - Superadmin Operacional

O Superadmin precisa deixar de ser apenas uma area de listagem e virar a central de operacao da plataforma.

### 1.1 Detalhe do Tenant

Criar rota:

```text
/superadmin/tenants/:tenantId
```

Deve exibir:

- dados principais do tenant;
- plano atual;
- status comercial;
- owner;
- dominio;
- usuarios;
- produtos;
- pedidos;
- videos;
- integracoes;
- uso de storage;
- eventos recentes;
- logs administrativos.

### 1.2 Acoes Administrativas

Permitir:

- editar nome do tenant;
- alterar plano;
- pausar tenant;
- reativar tenant;
- cancelar tenant;
- bloquear tenant;
- reenviar acesso ao owner;
- trocar owner;
- acessar usuarios do tenant;
- ver diagnostico de configuracao.

### 1.3 Audit Log

Criar `superadmin_audit_logs`.

Campos sugeridos:

- `id`
- `actor_user_id`
- `target_tenant_id`
- `target_user_id`
- `action`
- `before`
- `after`
- `metadata`
- `created_at`

Toda acao sensivel do Superadmin deve gerar log.

## Fase 2 - Billing da Propria Plataforma

O sistema precisa cobrar os clientes da Nory Members, nao apenas processar vendas dos tenants.

### 2.1 Assinaturas

Criar estrutura para:

- trial;
- assinatura ativa;
- upgrade;
- downgrade;
- cancelamento;
- inadimplencia;
- renovacao;
- historico de faturas.

Tabelas sugeridas:

- `platform_subscriptions`
- `platform_invoices`
- `platform_payments`
- `platform_billing_events`

### 2.2 Checkout da Plataforma

O checkout padrao para cobranca da propria plataforma deve ser a Nory, aproveitando a integracao que ja foi realizada no projeto. Isso reduz complexidade inicial e evita criar uma camada comercial paralela antes de validar a operacao.

Outros gateways podem existir futuramente como opcoes adicionais, mas nao devem ser requisito para o primeiro ciclo comercial.

Criar fluxo para o tenant contratar ou trocar plano:

- selecionar plano;
- escolher mensal/anual;
- pagar pelo checkout Nory;
- confirmar assinatura;
- aplicar plano;
- registrar evento;
- emitir fatura/recibo quando aplicavel.

Eventos da Nory devem atualizar a assinatura da plataforma, incluindo ativacao, renovacao, falha de pagamento, cancelamento, reembolso e chargeback quando esses eventos estiverem disponiveis.

### 2.3 Inadimplencia

Quando pagamento falhar:

- marcar tenant como `past_due`;
- exibir aviso no painel;
- bloquear recursos apos periodo de tolerancia;
- pausar uploads e recursos pagos;
- manter area do aluno conforme politica comercial definida.

## Fase 3 - Suporte Operacional

O suporte precisa resolver problemas sem consultar diretamente o banco.

### 3.1 Operacoes Com Alunos

No admin e/ou Superadmin:

- reenviar magic link;
- pausar acesso de aluno;
- reativar acesso;
- liberar acesso manual;
- remover acesso;
- ver historico de acesso;
- ver progresso por curso;
- ver produtos liberados;
- diagnosticar compra sem acesso.

### 3.2 Operacoes Com Pedidos

Criar tela operacional para:

- ver linha do tempo do pedido;
- ver webhooks recebidos;
- reprocessar webhook;
- reconciliar pagamento divergente;
- tratar reembolso;
- tratar chargeback;
- liberar acesso manualmente;
- remover acesso apos reembolso.

### 3.3 Operacoes Com Integracoes

Permitir:

- testar credenciais;
- ver ultimo erro;
- reprocessar evento;
- desconectar integracao;
- ver escopos/permissoes;
- ocultar integracoes indisponiveis por regiao/plano.

## Fase 4 - Video Hosting Comercial

A base de video e boa, mas precisa de controles comerciais e operacionais.

### 4.1 Quotas

Aplicar limites por plano:

- storage total;
- banda mensal;
- minutos de video;
- minutos de legenda por IA;
- quantidade de videos;
- quantidade de workspaces/projetos.

### 4.2 Observabilidade de Video

Criar visibilidade para:

- upload iniciado;
- upload falhou;
- processamento iniciado;
- processamento falhou;
- legenda solicitada;
- legenda concluida;
- webhook recebido;
- asset removido;
- custo estimado de IA.

### 4.3 Operacoes

Permitir:

- tentar processar novamente;
- apagar asset falhado;
- sincronizar status com provedor;
- regenerar token;
- verificar acesso do aluno a um video especifico.

## Fase 5 - Integracoes

### 5.1 Separar Integracoes Reais de Roadmap

Manter visiveis como configuraveis apenas as integracoes funcionais.

Funcionais atualmente:

- OpenAI;
- Anthropic;
- Hotmart;
- Nory;
- Vimeo;
- Panda Video;
- Wistia.

Integracoes indisponiveis devem aparecer como:

- ocultas;
- em breve;
- disponiveis apenas por plano/regiao;
- ou removidas da tela principal.

### 5.2 Criterio Para Considerar Uma Integracao Comercial

Uma integracao deve ter:

- tela de configuracao;
- validacao de credenciais;
- armazenamento seguro de secrets;
- teste de conexao;
- logs de erro;
- webhook ou sync quando aplicavel;
- documentacao minima;
- suporte a desconexao;
- cobertura de permissao por plano.

## Fase 6 - Seguranca, Compliance e Governanca

### 6.1 Auditoria

Registrar:

- alteracao de plano;
- pausa/reativacao de tenant;
- troca de owner;
- alteracao de dominio;
- liberacao manual de acesso;
- reprocessamento de pedido;
- alteracao de integracao;
- acoes de Superadmin.

### 6.2 LGPD/GDPR

Implementar:

- exportacao de dados;
- exclusao/anominizacao de dados;
- consentimento quando aplicavel;
- politica de retencao;
- logs de solicitacoes;
- processo para remover dados de aluno/tenant.

### 6.3 Permissoes

Evoluir RBAC para:

- owner;
- admin;
- support;
- finance;
- content;
- superadmin;
- superadmin support;
- superadmin finance.

## Fase 7 - Observabilidade e Operacao

Criar uma visao de saude da plataforma.

Indicadores:

- funcoes com erro;
- webhooks falhando;
- uploads falhando;
- tenants inadimplentes;
- integracoes desconectadas;
- pedidos pendentes;
- uso de storage;
- uso de IA;
- erros por tenant;
- jobs pendentes;
- eventos sem processamento.

Implementar:

- logs estruturados;
- correlacao por `tenant_id`, `user_id`, `order_id`;
- alertas;
- retentativas;
- painel interno de diagnostico.

## Fase 8 - Testes Comerciais Criticos

Criar testes automatizados para:

- cadastro de tenant;
- troca de plano;
- enforcement por plano;
- pausa e reativacao de tenant;
- compra de produto;
- webhook Hotmart/Nory;
- liberacao de acesso;
- reembolso/chargeback;
- upload de video;
- token protegido de video;
- tracking de progresso;
- RLS entre tenants;
- acoes do Superadmin com audit log.

## Roadmap Priorizado

### P0 - Bloqueadores Para Comercializacao

- Validar licenca e direito de comercializacao.
- Criar planos configuraveis.
- Criar billing da propria plataforma.
- Criar detalhe/edit de tenant no Superadmin.
- Criar status comercial do tenant.
- Criar audit logs.
- Centralizar entitlements por plano.

### P1 - Operacao Real

- Suporte operacional de alunos.
- Reprocessamento e reconciliacao de pedidos.
- Observabilidade de webhooks e Edge Functions.
- Quotas de video/storage/IA.
- Enforcement de inadimplencia.
- Melhorias de seguranca e compliance.

### P2 - Escala e Diferenciacao

- Mais integracoes funcionais.
- Analytics avancado.
- Automacoes comerciais.
- Templates de area de membros.
- Relatorios financeiros.
- Recursos enterprise.
- Marketplace/ecossistema.

## Ordem Recomendada de Desenvolvimento

1. Resolver licenca/comercializacao.
2. Implementar `platform_plans`.
3. Implementar entitlement resolver.
4. Implementar status comercial do tenant.
5. Implementar detalhe de tenant no Superadmin.
6. Implementar acoes administrativas com audit log.
7. Implementar billing da plataforma.
8. Implementar enforcement de plano/status.
9. Implementar suporte operacional de alunos/pedidos.
10. Implementar observabilidade e quotas.

## Criterio de Pronto Comercial

O projeto pode ser considerado comercialmente pronto quando:

- um cliente consegue contratar um plano sem intervencao manual;
- o sistema aplica automaticamente os limites do plano;
- o Superadmin consegue operar tenants sem acessar banco;
- inadimplencia, pausa e cancelamento funcionam;
- suporte consegue resolver problemas de acesso e pagamento;
- webhooks e videos tem logs e reprocessamento;
- acoes administrativas sao auditadas;
- ha testes nos fluxos financeiros e de acesso;
- a licenca permite comercializacao;
- existe monitoramento basico de saude da plataforma.

