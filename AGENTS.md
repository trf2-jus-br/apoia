# Notas para Agentes AI

## Limitações Conhecidas

### Simple Browser
- **Problema**: O Simple Browser não funciona com páginas que requerem autenticação
- **Contexto**: Aplicação usa NextAuth.js/Keycloak para autenticação
- **Solução**: Não usar `open_simple_browser` para testar páginas autenticadas
- **Alternativa**: Pedir ao usuário para testar manualmente no navegador
- **Status**: Limitação permanente da ferramenta

### Build
- **Problema**: O Build demora. Quando for possível, é melhor testar usando o "npm run check". Use o build completo só quando concluir uma alteração significativa.

## Arquitetura

### Stack
- **Next.js 16** com Turbopack, dev server na porta 8081
- **PostgreSQL** com Knex.js ORM (suporte a PostgreSQL e MySQL mantido em migrations)
- **Bootstrap/react-bootstrap** para UI
- **Autenticação**: NextAuth.js com Keycloak

### Estrutura Principal
- `app/(main)/` — Páginas principais da aplicação
- `app/api/` — Rotas de API
- `lib/db/dao/` — Data Access Objects (ex: `prompt.dao.ts`, `user.dao.ts`)
- `lib/db/mysql-types.ts` — Tipos TypeScript para registros do banco
- `lib/sync/` — Motor de sincronização de prompts (local/GitHub → DB)
- `lib/ui/` — Utilitários de UI (formulários, form-state)
- `lib/proc/` — Tipos de processo (Scope, Instance, Matter, Target, etc.)
- `lib/ai/` — Integração com modelos de IA
- `migrations/postgres/knex/` — Migrations PostgreSQL (auto-executadas no startup)
- `migrations/mysql/` — Migrations MySQL (manter em sincronia com as de PostgreSQL)
- `prompts/` — Arquivos .md dos prompts locais

### Tabela `ia_prompt`
- Coluna `content` (JSONB) armazena a definição completa do prompt
- `content.workflow` contém predecessores/sucessores: `{ predecessors?: [{uuid, name?, optional?, condition?}], successors?: [...] }`
- `uuid` identifica o prompt de forma estável entre versões; preservar ao editar (buscar do registro existente via `base_id`)
- `is_latest = 1` marca a versão corrente; versões anteriores têm `is_latest = 0`
- `origin` indica de onde veio o prompt sincronizado (ex: `local:./prompts`, `github:...`); `NULL` = criado pelo usuário
- `share` controla visibilidade: PADRAO, PUBLICO, BETA_TESTE, EM_ANALISE, NAO_LISTADO, PRIVADO, OCULTO
- Prompts com nome começando com `^` são internos/sistema e devem ser ocultos nas listagens de usuário (filtro `name NOT LIKE '^%'`)
- `category` (antigo `kind`) é nullable e atualmente setado como NULL
- `mode` categoriza o prompt por modo de operação (JUDICIAL/ADMINISTRATIVO; NULL = ambos)

### Tabela `ia_ticket` (Sistema de Chamados)
- PK `id` é **UUID** gerada pela aplicação (`crypto.randomUUID()` em `TicketDao.createTicket`); funciona como protocolo do chamado
- Snapshot dos dados do solicitante em colunas próprias (`username`, `user_name`, `user_email`, `system`, `court_id`); nomes de tribunal são resolvidos em tempo de exibição via `CourtDao.getCourtById` (cache local)
- `kind`: ERRO | DUVIDA | SUGESTAO; `status`: ABERTO | EM_ANALISE | RESOLVIDO
- `error_context` guarda a stack criptografada (Cryptr + `PROPERTY_SECRET`) vinda do `ErrorSpan`; descriptografada server-side na rota admin de detalhe
- `screenshot` (BYTEA/LONGBLOB) só é lida por `TicketDao.getScreenshot` e servida em `/api/v1/ticket/[uuid]/screenshot` (dono ou moderador); listagens nunca retornam o blob
- Entradas na UI: `TicketFormButton`/`TicketFormModal` (`components/ticket-form.tsx`, captura via `html2canvas` com consentimento), botão "Abrir chamado" no `ErrorSpan`, itens no `user-menu.tsx`
- Páginas: `/tickets` (usuário acompanha seus chamados e respostas) e `/admin/tickets` (moderador: estatísticas, lista, detalhe, resposta) — guard `isUserModerator`

### Modo de Operação via URL (`/adm`)
- O modo (JUDICIAL/ADMINISTRATIVO) é derivado da **URL**, não de preferência persistida: prefixo `/adm` = ADMINISTRATIVO; URL sem prefixo = JUDICIAL, sempre. A coluna `ia_user_prefs.mode` foi removida (migration-029).
- `proxy.ts` (raiz; Next 16 renomeou `middleware.ts` → `proxy.ts`) intercepta `/adm/:path*`, faz rewrite interno para o path sem prefixo e injeta o request header `x-apoia-mode`; em URLs sem prefixo o header é removido (anti-spoofing).
- Server-side: `getMode()` e `getModePrefix()` em `lib/utils/prefs.ts` leem o header. Client-side: `useModePrefix()` (`lib/utils/use-mode-prefix.ts`) e `ModeLink` (`components/mode-link.tsx`).
- Links, redirects e fetches **sensíveis ao modo** (home, menu, chat, fluxo de prompts/processos, `/api/v1/ai`, `/api/v1/build-requests`, binary de peça) devem preservar o prefixo usando esses helpers. URLs que já vêm de `usePathname()` preservam o prefixo automaticamente.
- O toggle "Modo SEI!" (`components/user-menu-mode.tsx`) apenas navega para a mesma página com/sem o prefixo.

### Migrations
- Migrations SQL ficam em `migrations/postgres/knex/` e `migrations/mysql/`
- São executadas automaticamente no startup via `lib/migrate-on-start.ts` usando Knex migration source
- Ao criar uma migration para PostgreSQL, **sempre criar a equivalente para MySQL**
- PostgreSQL usa `ALTER TABLE ... RENAME COLUMN`; MySQL usa `ALTER TABLE ... CHANGE COLUMN`
- PostgreSQL usa JSONB operators (`::jsonb`, `jsonb_build_object`); MySQL usa `JSON_MERGE_PATCH`, `JSON_OBJECT`
- Migrations MySQL usam prefixo de schema `` `apoia`. `` e backticks

## Boas Práticas

### Server/Client Boundary (Next.js)
- Arquivos com `'use server'` (server actions) **não podem** importar de arquivos com `'use client'`
- `lib/ui/form-state.ts` — Utilitários de formulário compatíveis com server (sem `'use client'`): `FormState`, `EMPTY_FORM_STATE`, `fromErrorToFormState`
- `lib/ui/form-support.tsx` — Componentes de formulário client-side (`'use client'`), re-exporta o que vem de `form-state.ts`
- Server actions devem importar de `@/lib/ui/form-state`, não de `@/lib/ui/form-support`

### Formulários (FormHelper / Frm)
- Usar a classe `FormHelper` (`Frm`) para componentes de formulário: `Frm.Input`, `Frm.Select`, `Frm.MultiSelect`, `Frm.TextArea`, `Frm.Checkbox`, `Frm.Markdown`, `Frm.Button`
- Chamar `Frm.update(data, setData, formState)` no início do render
- Zod schemas para validação nas server actions

### Sincronização de Prompts
- `lib/sync/sync-engine.ts` sincroniza prompts de origins (local, GitHub) para o banco
- Workflow references são resolvidas de `path:` (slug) → `uuid` durante a sincronização
- O `buildNameIndex()` resolve UUID → name para popular o campo `name` nos workflow steps
- Tipos em `lib/sync/types.ts`: `ParsedPrompt`, `WorkflowRef`, `WorkflowStepResolved`, `WorkflowResolved`

### Debugging
- Usar console.log estratégicos para debugging
- Pedir ao usuário para verificar logs no navegador quando necessário
- Remover logs de debug após resolver problemas

### UI/UX
- Sempre informar ao usuário por que botões estão desabilitados
- Usar Bootstrap alerts para feedback visual claro
- Validar estados e dar feedback apropriado

### Estilo de Código
- **Não usar emoticons** no código, logs ou interface
- Manter mensagens profissionais e diretas
- Usar texto claro sem decorações desnecessárias

### Testes e Verificação
Os comandos de verificação são definidos como scripts no `package.json` e **DEVEM ser usados sempre na forma canônica abaixo** (nunca variar com flags, `npx` direto, ou caminhos alternativos). Usar exatamente o comando listado garante que a camada de permissão reconheça o comando e evita confirmações desnecessárias.

| Verificação | Comando canônico | Quando usar |
|-------------|------------------|-------------|
| Type check | `npm run typecheck` | Após qualquer edição de código (rápido) |
| Lint + type check | `npm run check` | Check padrão antes de finalizar uma alteração |
| Sync engine | `npm test -- sync` | Ao mexer em `lib/sync/` |
| Pattern matching | `npm test -- tests/documentMatch` | Ao mexer em `lib/proc/pattern.ts` ou `combinacoes.ts` |
| Todos os testes | `npm test` | Antes de commit / build |
| Build completo | `npm run build` | Só ao concluir alteração significativa (demora) |

- **Nunca** usar `npx tsc --noEmit`, `npx jest ...`, `tsc -p tsconfig.json`, etc. Sempre os scripts do `package.json` acima.
- O `npm run check` roda `lint` + `typecheck` em sequência; se o `lint` falhar por problema de ambiente (ex.: Next 16 CLI), caia para `npm run typecheck` que é o crítico.
- O Build demora. Prefira `npm run check`. Use o build completo só ao concluir uma alteração significativa.

## Pattern Matching de Peças e Eventos

### Visão Geral
O motor de pattern matching seleciona peças de um processo judicial com base em padrões declarativos. Fica em `lib/proc/pattern.ts` (engine) e `lib/proc/combinacoes.ts` (padrões e estratégias).

### Algoritmo
- **Varredura backward-recursiva**: `matchFromIndex` percorre a sequência de trás para frente, casando operadores do pattern de trás para frente também.
- **Backtracking**: operadores como `ANY` e `SOME` geram candidatos (consumos possíveis) e tentam cada um; se falhar, volta e tenta o próximo.
- `matchFull` retorna `MatchFullResult` com items capturados, fases marcadas e última fase.
- `selecionarPecasPorPadraoComFase` (em `combinacoes.ts`) é o ponto de entrada principal — recebe peças, padrões e opcionalmente `movimentosEDocumentos`.

### Tipos de Sequência
- **`Documento`**: peça do processo (`id`, `tipo: T`, `numeroDoEvento`, `descricaoDoEvento`). O campo `kind` é opcional (ausente = documento por backward compat).
- **`Evento`**: movimento processual (`kind: 'evento'`, `sequencia`, `descricao`, `tipoNome?`). Criado a partir de `InteropMovimentoComDocumentosType`.
- **`SequenceItem = Documento | Evento`**: quando `movimentosEDocumentos` é fornecido, a sequência intercala eventos e seus documentos; senão, usa array plano de documentos.

### Operadores
| Operador | Faz match com | Comportamento |
|----------|--------------|---------------|
| `EXACT(T.X)` | Documento | Casa exatamente com tipo `X`. `captureAllInSameEvent` captura docs do mesmo evento. |
| `OR(T.A, T.B)` | Documento | Casa com qualquer dos tipos listados. |
| `ANY(opts)` | Docs + Eventos | Consome 0..N itens. `capture` lista tipos a capturar (docs); `except` para em certos tipos de doc; `exceptEvent` para em certos eventos. `greedy` tenta consumir o máximo primeiro. |
| `SOME(opts)` | Docs + Eventos | Como `ANY` mas exige pelo menos 1 captura. |
| `EVENT(criteria)` | Evento | Casa com evento por `descricao` e/ou `tipoNome` (string exata ou RegExp). Campos em AND; itens de `exceptEvent[]` em OR. |
| `PHASE(name)` | Nenhum | Marcador de fase (sugar para `ANY(undefined, name)`). Não consome itens. |

### Eventos em ANY/SOME
- Eventos são consumidos transparentemente (sem captura) por `ANY` e `SOME`.
- `exceptEvent: EventMatch[]` faz `ANY`/`SOME` parar ao encontrar um evento que case com algum dos critérios.

### Padrões e Estratégias
- Padrões são arrays de `MatchOperator[]` (um pattern). Estratégias são arrays de patterns (`MatchOperator[][]`) tentados em ordem.
- `PieceStrategy` em `combinacoes.ts` mapeia nomes (ex: `MAIS_RELEVANTES`, `SUSPENSAO`) a conjuntos de padrões.
- `padroesSuspensao` usa `EVENT({ tipoNome: regex })` para identificar eventos de suspensão por IRDR/Repetitivos/Repercussão Geral.

### Fluxo de Dados
1. `consultarProcesso` (pdpj.ts) popula `movimentosEDocumentos` via `mapPdpjToSimplified`
2. `DadosDoProcessoType` carrega `movimentosEDocumentos?: InteropMovimentoComDocumentosType[]`
3. `selecionarPecasPorPadraoComFase` recebe como 3º parâmetro opcional e constrói `SequenceItem[]`
4. Chamadores: `analysis.ts`, `process.ts`, `process-contents.tsx`, `AbusiveLitigationPage.tsx` (todos passam `movimentosEDocumentos`); `select-pieces/route.ts` não tem acesso (param opcional, degrada gracefully)