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

### Extração de PDF
- A extração de texto de PDFs é feita pelo binário nativo **Poppler (`pdftotext`)**, invocado via `child_process.spawn` em `lib/pdf/pdf.ts` (`pdfToText`). Roda num **subprocesso fora do event loop** do Node (antes usava `pdf-parse`/PDF.js in-process, que bloqueava o servidor).
- Requer `pdftotext` no PATH. **Produção (Docker)**: `poppler-utils` instalado via `apt-get` no estágio `runner` do `Dockerfile`. **Dev Windows**: instalar via `scoop install poppler` ou `choco install poppler` e garantir `pdftotext` no PATH.
- A saída envolve cada página em marcadores `<page number="N">...</page>` (convertidos do form-feed `\f` do pdftotext por `wrapPages`). **Não remover/renumerar** — esses marcadores são consumidos pelo sistema de citações n-grams (tooltip "Pág: N" em `lib/n-grams/`), por `obterPaginasECaracteres` em `lib/proc/piece.ts` (decide o threshold de OCR) e por `components/EditorComponent.tsx`.
- Concorrência de subprocessos limitada por `p-limit` (env `PDF_PARSE_LIMIT`, default 1); cap de 10MB (`MAX_PDF_BYTES`); timeout via env `PDFTOTEXT_TIMEOUT_MS` (default 120s).

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

### Tabela `ia_library` (Biblioteca de Documentos)
- Versionamento como prompts: `base_id`/`uuid`/`is_latest`; editar (`updateLibrary`) cria nova versão (INSERT) e move anexos/exemplos para a nova linha; `share` é propriedade do documento e vale para todas as versões
- `share` controla visibilidade: PADRAO (curadoria da Apoia, setado só por moderador), PUBLICO, NAO_LISTADO, PRIVADO (default)
- Acessibilidade de leitura (todos os reads do `LibraryDao`): próprio OU favoritado OU `share IN (PADRAO, PUBLICO)`; escrita/exclusão restritas ao dono
- Favoritos (`ia_library_favorite`) por **uuid** (`library_uuid`, dual-write como `prompt_uuid` na migration-020); links de compartilhamento/favoritar usam `/library/{uuid}/set-favorite` — ids sequenciais não funcionam mais
- Auto-inclusão em prompts (`defaultLibraryDocumentIds` em `lib/ai/library-defaults.ts`, usada por client e server): `inclusion=SIM` próprio/favoritado + casamento `slugify(título) === slug do prompt` com prioridade **próprio > favoritado > PADRAO**; docs PADRAO só entram via casamento de nome (nunca entram em todos os prompts)
- `ChooseLibrary` lista apenas próprios + favoritados + PADRAO com slug casante (`documentsForChooseLibrary`); coluna "Origem" diferencia Meu/Favorito/Padrão da Apoia; descoberta de docs PADRAO/PUBLICO de terceiros é em `/library` (tabs Principais/Não Avaliados)
- Páginas `set-standard|set-public|set-private|set-unlisted` têm guard `isUserModerator`; rota `/api/v1/library` só aceita `share=PADRAO` de moderador

### Tabela `ia_ticket` (Sistema de Chamados)
- PK `id` é **UUID** gerada pela aplicação (`crypto.randomUUID()` em `TicketDao.createTicket`); funciona como protocolo do chamado
- Snapshot dos dados do solicitante em colunas próprias (`username`, `user_name`, `user_email`, `system`, `court_id`); nomes de tribunal são resolvidos em tempo de exibição via `CourtDao.getCourtById` (cache local)
- `kind`: ERRO | DUVIDA | SUGESTAO; `status`: ABERTO | EM_ANALISE | RESOLVIDO
- `error_context` guarda a stack criptografada (Cryptr + `PROPERTY_SECRET`) vinda do `ErrorSpan`; descriptografada server-side na rota admin de detalhe
- `screenshot` (BYTEA/LONGBLOB) só é lida por `TicketDao.getScreenshot` e servida em `/api/v1/ticket/[uuid]/screenshot` (dono ou moderador); listagens nunca retornam o blob
- Entradas na UI: `TicketFormButton`/`TicketFormModal` (`components/ticket-form.tsx`, captura via `html2canvas` com consentimento), botão "Abrir chamado" no `ErrorSpan`, itens no `user-menu.tsx`
- Páginas: `/tickets` (usuário acompanha seus chamados e respostas) e `/admin/tickets` (moderador: estatísticas, lista, detalhe, resposta) — guard `isUserModerator`

### Painel de Avaliações de IA (`/admin/evaluations`)
- Painel de estatísticas das avaliações negativas (thumbs-down) registradas em `ia_generation` (`evaluation_id`, `evaluation_descr`, `evaluation_user_id`); restrito a moderadores (guard `isUserModerator` na página e na rota)
- Dados: `GenerationDao.retrieveEvaluationStats` (agregações por motivo, dia, modelo e prompt + últimas avaliações); prompts agrupados por nome (`COALESCE(p.name, g.prompt)`) pois um prompt tem várias versões
- Rota: `GET /api/v1/admin/evaluation-stats` (params `startDate`, `endDate`, `model`, `prompt`); página `app/(main)/admin/evaluations/`; gráficos com recharts
- `evaluate()` em `lib/ai/generate.ts` recebe o `generationId` via metadata do stream de `/api/v1/ai` (fallback legado reconstrói o sha256 das messages)

### Modo de Operação via URL (`/adm`)
- O modo (JUDICIAL/ADMINISTRATIVO) é derivado da **URL**, não de preferência persistida: prefixo `/adm` = ADMINISTRATIVO; URL sem prefixo = JUDICIAL, sempre. A coluna `ia_user_prefs.mode` foi removida (migration-029).
- `proxy.ts` (raiz; Next 16 renomeou `middleware.ts` → `proxy.ts`) intercepta `/adm/:path*`, faz rewrite interno para o path sem prefixo e injeta o request header `x-apoia-mode`; em URLs sem prefixo o header é removido (anti-spoofing).
- Server-side: `getMode()` e `getModePrefix()` em `lib/utils/prefs.ts` leem o header. Client-side: `useModePrefix()` (`lib/utils/use-mode-prefix.ts`) e `ModeLink` (`components/mode-link.tsx`).
- Links, redirects e fetches **sensíveis ao modo** (home, menu, chat, fluxo de prompts/processos, `/api/v1/ai`, `/api/v1/build-requests`, binary de peça) devem preservar o prefixo usando esses helpers. URLs que já vêm de `usePathname()` preservam o prefixo automaticamente.
- O toggle "Modo SEI!" (`components/user-menu-mode.tsx`) apenas navega para a mesma página com/sem o prefixo.

### Servidor MCP e tabela `ia_mcp_token`
- Endpoint em `app/api/mcp/[transport]/route.ts` (mcp-handler, basePath `/api/mcp`); tools em `lib/mcp/mcp-registry.ts`; auth por `token_id` via header `Authorization: Apoia-MCP <id>` ou query `?token=<id>`.
- 1 linha por usuário (PK `user_id`); `token_ciphertext` guarda o JWT PDPJ encriptado com `DATABASE_SECRET` (Cryptr); `token_id` curto vai na URL (`/api/mcp/mcp?token=<id>`, gerada em `lib/mcp/mcp-config.ts`, página `/mcp`).
- O `token_id` é **estável**: a cada login, o callback `jwt` do NextAuth (`options.ts`) chama `McpTokenDao.refreshForUsername` (import dinâmico, evita ciclo com `lib/user.ts`), renovando `token_ciphertext`/`expires_at` — a URL configurada no cliente MCP não muda. Gerar novamente em `/mcp` rotaciona o `token_id` (= revogação).
- Purge lazy em `issueForCurrentUser` só apaga tokens expirados há mais de 30 dias (grace para o login "reviver" o link); não há cron.
- Nunca logar o JWT decifrado (já houve log assim em `resolveUserByTokenId`, removido).

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

### Acessibilidade

O projeto segue uma iniciativa de acessibilidade baseada em `accessKey` + letra sublinhada, feedback sonoro e ARIA. Os padrões abaixo são aditivos (sem mudar layout/comportamento) e devem ser aplicados em novos componentes.

#### accessKey + `<u>`
- Padrão: atributo `accessKey="letra"` no elemento focável + letra sublinhada no texto visível com `<u>L</u>`. A letra sublinhada deve corresponder à tecla do accessKey.
- Em JSX de botões/tabs, `<u>` é elemento literal: `<span>Pr<u>i</u>ncipais</span>` com `tabAttrs={{ accessKey: "i" }}`.
- Em links da navbar (`NavigationLink`), `<u>` é string HTML passada em `text` (renderizada via `dangerouslySetInnerHTML`): `text="E<u>m</u>enta" accessKey="m"`.
- **Mapa de teclas (respeitar — evitar conflitos na mesma página):**
  - Navbar (todas as páginas): `c`=Chat, `p`=Prompts, `t`=Revisão de Texto, `m`=Ementa.
  - `/prompts`: tab Principais=`i`, tab Não Avaliados=`a`, Tramitação=`r`, Número=`n`, Filtro=`f`, Prosseguir (choose-pieces)=`s`.
  - Por contexto: Chat Enviar=`e`, Anexar=`x`; print PDF=`d`; listen Ouvir=`u`; pedidos Gerar=`g`; Prosseguir (process-number-form/target-text)=`s` (não co-renderizam com choose-pieces).
- **Botões desabilitados**: sempre explicar o motivo. Usar `aria-describedby` apontando para um `<span id="...-help">` (visível ou `visually-hidden`) com a instrução, ou `title` quando não houver texto de instrução.

#### Sons (`lib/sound.ts`)
Funções disponíveis e quando usar:
- `playTaskStartSound()` — início de uma tarefa de IA (ex.: `AiContent.run()`).
- `playTaskEndSound()` — conclusão com sucesso (ex.: fim do stream sem erro).
- `playErrorSound()` — erro/falha (ex.: `reportError`, erros do chat, toast danger, filtro sem resultados).
- `playClickSound()` — feedback leve (ex.: processo carregado, mensagem do chat finalizada).
- `playConvergeSound()` — convergência de filtro para prompt único.
- `playNotifySound()` — notificação pontual.
O `AudioContext` é singleton (com resume em suspensão). Para ler o estado de erro de forma síncrona dentro de callbacks (ex.: `finally` do stream), use um ref espelhado do estado (ver `errormsgRef` em `ai-content.tsx`).

#### Padrões ARIA
- **Texto só para leitores de tela**: `<span className="visually-hidden">...</span>`. Para placeholders decorativos (`placeholder-glow`), manter `aria-hidden="true"` no container e adicionar um sr-only "Carregando...".
- **Live regions**: `role="status"` / `aria-live="polite"` para progresso e estados de carregamento; `role="log" aria-live="polite"` para históricos (ex.: mensagens de chat); `role="alert"` para erros e avisos. Atenção: o `Alert` do react-bootstrap renderiza `role="alert"` por padrão — sobrescrever com `role="status"` em confirmações de sucesso (polite).
- **Botões clicáveis**: sempre `<button>` em vez de `<span>`/`<div>` com `onClick` (mesmo mantendo a aparência via classes Bootstrap como `btn btn-link p-0`). Para dropzones/áreas clicáveis, usar `role="button" tabIndex={0}` + `onKeyDown` (Enter/Espaço).
- **Labels de formulário**: associar label↔controle via `htmlFor`+`id`, `controlId` no `Form.Group` (react-bootstrap gera ambos), ou `aria-label` quando não houver label visível.
- **Botões só-ícone**: sempre `aria-label` descritivo (ou `<span className="visually-hidden">` com o texto).
- **Tabelas**: `<th scope="col">` nos cabeçalhos e `<caption className="visually-hidden">` para dar contexto.
- **Gráficos**: wrapper com `role="img"` + `aria-label` resumindo o conteúdo.
- **Estados visuais-only** (ex.: `opacity-25` para itens "desconsiderados"): adicionar sr-only com o significado (ex.: `(desconsiderado)`).
- **Informações só em `title`/cor** (ex.: custo/tokens no rodapé de mensagem): replicar em `aria-label`.

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