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

### Testes
- Testes do sync engine: `npx jest sync` (26 testes)
- Type check: `npx tsc --noEmit`
- Check rápido: `npm run check`
- Build completo: `npm run build`