# Plano de Refatoracao: Unificacao de Prompts

## Contexto

A Apoia possui atualmente tres "mundos" de prompts que coexistem de forma desconectada:

1. **Prompts internos** -- arquivos `.md` no codigo-fonte, carregados em memoria via `internalPrompts`
2. **Prompts de usuario** -- criados pela UI, armazenados em `ia_prompt`
3. **Seeds de TipoDeSintese** -- registros em `ia_prompt` com prefixo `^`, usados apenas para exibicao, favoritos e ratings

Essa dualidade gera problemas concretos:

- `ia_generation.prompt_id` fica `NULL` para prompts internos (sem rastreabilidade)
- Relatorios mostram slugs crus em vez de nomes legiveis
- Nao ha vinculo entre uma geracao e o TipoDeSintese que a disparou
- Cada feature nova paga "taxa dupla" de implementacao (dois fluxos)
- Impossivel evoluir para workflows configuraveis pelo usuario

## Decisoes Arquiteturais

### 1. Banco como source of truth em runtime

Todo prompt vive em `ia_prompt`. Nao ha mais leitura direta de `.md` em runtime. O dicionario `internalPrompts` deixa de existir como fonte de definicoes.

### 2. Repositorios GitHub como fonte de prompts

Prompts sao mantidos em repositorios Git (um ou mais). A ENV `PROMPT_LIBRARIES` lista as fontes:

```
PROMPT_LIBRARIES=github:cnj-ia/prompts-core,github:trf2/prompts-previdenciario,local:./prompts
```

Providers suportados:

| Provider | Uso | Mecanismo |
|----------|-----|-----------|
| `github:owner/repo` | Producao e staging | Download de tarball via GitHub API |
| `local:./path` | Desenvolvimento local | Leitura direta do filesystem |

### 3. UUID como identidade portavel

Cada prompt possui um UUID imutavel que o identifica em qualquer instalacao. O UUID viaja na secao `# METADATA` do `.md` e e usado como chave de sincronismo.

- Prompt criado na UI: sistema gera UUID na criacao
- Prompt de repositorio GitHub: UUID **obrigatorio** no metadata; ausencia gera erro de sync
- Prompt de provider `local:`: se UUID ausente, sistema gera e reescreve o `.md`

O UUID substitui o papel do `base_id` como agrupador de versoes.

### 4. Versionamento no banco

Toda alteracao (seja via sync ou via UI) cria uma **nova versao** em `ia_prompt` com o mesmo `uuid`. A versao corrente e marcada com `is_latest = 1`. Historico completo preservado, inclusive para prompts sincronizados de repositorio.

### 5. Lock de edicao

- Prompts vindos de repositorio (`library IS NOT NULL`): **read-only** na UI. Usuario pode duplicar para criar sua variante.
- Prompts criados pelo usuario (`library IS NULL`): editaveis apenas pelo criador.

### 6. Prompts como blocos unificados (prompt, agregador, workflow)

Um prompt pode ser:

| Tipo | Como identificar | Caracteristica |
|------|-----------------|---------------|
| **Prompt simples** | Tem `system_prompt` e/ou `prompt` preenchidos, sem `workflow` | Executa sozinho |
| **Agregador** | Sem `system_prompt` e sem `prompt`, com `workflow` definido | Nao gera conteudo proprio, orquestra filhos |
| **Workflow** | Tem `system_prompt` e/ou `prompt`, e tambem `workflow` | Executa prompt proprio e orquestra filhos |

Nao ha coluna `is_aggregator` no banco. A distincao e inferida: se `system_prompt` e `prompt` estao ambos vazios/nulos, o prompt e um agregador puro. Isso simplifica o modelo e evita inconsistencias (ex: marcar `is_aggregator = true` mas ter prompt preenchido).

Para o usuario, tudo e "um prompt". A complexidade de encadeamento e opcional e progressiva.

### 7. Workflow: antecessores e sucessores

A configuracao de workflow separa explicitamente **antecessores** (prompts que devem ser executados antes) e **sucessores** (prompts executados depois). Isso e importante porque:

- **Antecessores** produzem conteudo que alimenta o prompt principal (ex: resumos de pecas que alimentam a analise)
- **Sucessores** consomem o resultado do prompt principal (ex: chat que recebe o contexto da sentenca)
- A distincao permite que o runtime monte a pipeline corretamente: antecessores -> prompt principal -> sucessores

## Modelo de Dados

### Alteracoes em `ia_prompt`

```sql
ALTER TABLE ia_prompt
  ADD COLUMN uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN library VARCHAR(128) NULL,
  ADD COLUMN library_version VARCHAR(64) NULL,
  ADD COLUMN workflow JSONB NULL;

CREATE UNIQUE INDEX uk_ia_prompt_uuid_latest
  ON ia_prompt (uuid) WHERE is_latest = 1;
```

- `uuid` -- identidade portavel, imutavel, compartilhada entre versoes
- `library` -- origem (`'github:cnj-ia/prompts-core'`, `NULL` para prompts de usuario)
- `library_version` -- commit SHA do repositorio na ultima sincronizacao
- `workflow` -- JSONB com antecessores e sucessores (ver estrutura abaixo)

Estrutura do campo `workflow`:

```jsonc
{
  "predecessors": [
    { "uuid": "<uuid-resumo-pecas>", "optional": false },
    { "uuid": "<uuid-triagem>", "optional": true, "condition": "..." }
  ],
  "successors": [
    { "uuid": "<uuid-chat>", "optional": true }
  ]
}
```

Um prompt e considerado **agregador** quando `workflow` esta preenchido mas `system_prompt` e `prompt` estao ambos nulos. Nao ha necessidade de coluna explicita para isso.

### Alteracoes em `ia_generation`

```sql
ALTER TABLE ia_generation
  ADD COLUMN execution_id UUID NULL,
  ADD COLUMN aggregator_prompt_id INT NULL;

ALTER TABLE ia_generation
  ADD CONSTRAINT fk_aggregator_prompt_id
  FOREIGN KEY (aggregator_prompt_id) REFERENCES ia_prompt(id) ON DELETE SET NULL;

CREATE INDEX idx_ia_generation_execution_id ON ia_generation (execution_id);
CREATE INDEX idx_ia_generation_aggregator ON ia_generation (aggregator_prompt_id);
```

- `execution_id` -- UUID que agrupa todas as geracoes disparadas por um mesmo workflow numa mesma execucao do usuario. Permite reconstruir a sessao completa.
- `aggregator_prompt_id` -- aponta para o `ia_prompt.id` do prompt principal/agregador que disparou esta geracao. Se a geracao foi avulsa (prompt simples executado diretamente), este campo fica `NULL`. Se foi parte de um workflow, aponta para o agregador.

O campo `prompt_id` existente continua apontando para o prompt atomico que de fato gerou o conteudo. Agora passa a ser **sempre preenchido** (nunca mais `NULL`), pois todos os prompts estarao no banco.

Exemplo de geracoes de um workflow "Minuta de Sentenca":

| id | prompt_id | aggregator_prompt_id | execution_id |
|----|-----------|---------------------|--------------|
| 201 | 15 (pedidos) | 42 (minuta-sentenca) | abc-123 |
| 202 | 18 (sentenca) | 42 (minuta-sentenca) | abc-123 |
| 203 | 20 (chat) | 42 (minuta-sentenca) | abc-123 |

### Alteracoes em `ia_favorite`

```sql
-- Migrar de prompt_id (int, referenciando base_id) para uuid
ALTER TABLE ia_favorite ADD COLUMN prompt_uuid UUID NULL;
-- Popular a partir dos dados existentes, cruzando com ia_prompt
-- Depois: DROP COLUMN prompt_id, rename, add constraint
```

### Alteracoes em `ia_prompt_rating`

```sql
-- Migrar de prompt_base_id (int) para uuid
ALTER TABLE ia_prompt_rating ADD COLUMN prompt_uuid UUID NULL;
-- Popular a partir dos dados existentes, cruzando com ia_prompt
-- Depois: DROP COLUMN prompt_base_id, rename, add constraint
```

## Formato dos Arquivos .md

Os arquivos `.md` ja usam o formato de secoes separadas por titulos `# TAG`. As tags reconhecidas pelo parser atual (`promptDefinitionFromMarkdown`) sao: `# METADATA`, `# SYSTEM PROMPT`, `# PROMPT`, `# JSON SCHEMA`, `# FORMAT`.

Para a refatoracao, a secao `# METADATA` passa a ser obrigatoria e contem YAML com o uuid e metadados do prompt:

```markdown
# METADATA

uuid: a1b2c3d4-e5f6-7890-abcd-ef1234567890
name: Analise Completa
target: PROCESSO
scope: [Federal, Estadual]
instance: [PRIMEIRO_GRAU, SEGUNDO_GRAU]
plugins: [TRIAGEM, NORMAS]

# SYSTEM PROMPT

Voce e um especialista em direito brasileiro...

# PROMPT

Analise o caso a seguir:

{{textos}}

# JSON SCHEMA

{ ... }
```

Esse formato e retrocompativel: a funcao `promptDefinitionFromMarkdown` ja reconhece `# METADATA` e faz parse YAML via `yamlps.load()`. A unica mudanca e que `uuid` passa a ser um campo esperado dentro do METADATA.

## Estrutura de Repositorio de Prompts

```
cnj-ia/prompts-core/
  library.yaml
  prompts/
    analise.md
    sentenca.md
    resumo-peca.md
  workflows/
    resumos-triagem.yaml
    minuta-de-sentenca.yaml
```

### library.yaml

```yaml
name: "Apoia Core"
version: "2.4.0"
author: "CNJ-IA"
```

### Workflow YAML

Workflows sao definidos em YAML separado. Cada workflow define um prompt agregador com seus antecessores e sucessores:

```yaml
uuid: f1e2d3c4-b5a6-7890-abcd-ef1234567890
name: Minuta de Sentenca
target: PROCESSO
instance: [PRIMEIRO_GRAU]

predecessors:
  - uuid: <uuid-do-prompt-pedidos>

successors:
  - uuid: <uuid-do-prompt-chat>
    optional: true
```

Se o workflow tem `# SYSTEM PROMPT` / `# PROMPT` definidos em um `.md` com o mesmo uuid, ele e um workflow com prompt proprio. Se nao tem (so existe no `.yaml`), e um agregador puro.

Exemplo de agregador puro (Resumos e Triagem -- nao tem prompt proprio):

```yaml
uuid: 11111111-2222-3333-4444-555555555555
name: Resumos e Triagem
target: PROCESSO

predecessors:
  - uuid: <uuid-resumo-pecas>
  - uuid: <uuid-triagem>
    optional: true

successors:
  - uuid: <uuid-chat>
    optional: true
```

Exemplo com condicoes (evolucao futura):

```yaml
uuid: 22222222-3333-4444-5555-666666666666
name: Analise Contextual
target: PROCESSO

predecessors:
  - uuid: <uuid-analise-base>
  - uuid: <uuid-analise-civel>
    condition: "matter == 'CIVEL'"
  - uuid: <uuid-analise-criminal>
    condition: "matter == 'CRIMINAL'"
```

## Sync Engine

### Fluxo de sincronizacao

```
Startup / Periodico
  |
  Para cada library em PROMPT_LIBRARIES:
  |
  +-- github: provider
  |     Fetch tarball (GET /repos/{owner}/{repo}/tarball/main)
  |     Extrair em memoria
  |     Obter commit SHA
  |     Se SHA == library_version no banco: skip
  |
  +-- local: provider
  |     Ler arquivos do filesystem
  |     Calcular hash do diretorio
  |
  +-- Para cada .md:
  |     Parse secoes (METADATA, SYSTEM PROMPT, PROMPT, etc.)
  |     Extrair uuid do METADATA
  |     github: UUID ausente? ERRO, abortar sync dessa library
  |     local: UUID ausente? Gerar UUID, reescrever o .md com uuid no METADATA
  |     Buscar ia_prompt WHERE uuid = X AND is_latest = 1
  |     Se nao existe: INSERT (nova versao, is_latest = 1)
  |     Se existe e conteudo mudou:
  |       UPDATE is_latest = 0 na versao anterior
  |       INSERT nova versao com is_latest = 1, mesmo uuid
  |     Se existe e conteudo igual: skip
  |
  +-- Para cada workflow .yaml:
  |     Parse antecessores/sucessores, resolver UUIDs
  |     Mesmo upsert por UUID com versionamento
  |
  +-- Prompts do banco com esta library que NAO estao mais no repositorio:
  |     Desativar (is_latest = 0) -- nunca deletar
  |
  +-- Atualizar library_version com commit SHA
  |
  +-- Log resultado: N adicionados, N atualizados, N desativados
```

### Regras de sincronismo

- Sync **nunca** deleta prompts. Prompts removidos do repositorio sao **desativados** (`is_latest = 0`). Isso preserva historico, geracoes vinculadas, favoritos e ratings.
- Sync **nunca** altera prompts de outra library ou de usuario.
- Favoritos e ratings sao vinculados ao UUID e sobrevivem a atualizacoes de conteudo e desativacoes.
- Cada library opera no seu escopo: so toca registros com `library = <sua origem>`.

## Fases de Implementacao

### F1: Migration do banco de dados
- Adicionar `uuid`, `library`, `library_version`, `workflow` em `ia_prompt`
- Adicionar `execution_id` e `aggregator_prompt_id` em `ia_generation`
- Gerar UUIDs para todos os registros existentes em `ia_prompt`
- Migrar `ia_favorite` e `ia_prompt_rating` para usar `uuid`
- Popular `prompt_id` retroativamente em `ia_generation` para prompts internos

### F2: Sync engine com provider `local:`
- Parser de secoes `# TAG` nos `.md` (reutilizar logica de `promptDefinitionFromMarkdown`)
- Extracao de `uuid` e metadados da secao `# METADATA`
- Logica de upsert por UUID com versionamento (nova versao a cada mudanca)
- Desativacao de prompts removidos do diretorio
- Auto-geracao de UUID e reescrita do `.md` quando uuid ausente
- Adicionar secao `# METADATA` com UUID nos `.md` existentes em `prompts/`
- Substituir `syncInternalPrompts` atual pelo novo sync engine
- Criar workflows `.yaml` correspondentes ao `TipoDeSinteseMap` atual

### F3: Runtime le do banco
- Substituir `internalPrompts[slug]` por query ao banco (`WHERE uuid = X AND is_latest = 1`)
- Cache em memoria com invalidacao por TTL ou evento de sync
- `insertIAGeneration` preenche `prompt_id` sempre
- Preencher `execution_id` e `aggregator_prompt_id` quando execucao e parte de workflow

### F4: Sync engine com provider `github:`
- Download de tarball via GitHub API (com token opcional para rate limit)
- Extracao em memoria
- Comparacao por commit SHA para evitar sync desnecessario
- Configuracao via ENV `PROMPT_LIBRARIES` e `PROMPT_LIBRARIES_TOKEN` (opcional)
- Log e tratamento de erros (UUID ausente, repo inacessivel, etc.)

### F5: Workflows no banco
- `TipoDeSinteseMap` migrado para registros com `workflow` JSONB (antecessores/sucessores)
- Runtime le workflow do banco e orquestra execucao: antecessores -> prompt principal -> sucessores
- `TipoDeSinteseMap` em codigo pode ser removido ou mantido apenas como fallback

### F6: UI e ferramentas
- Monaco Editor na tela de edicao de prompts (substituir textarea)
- Botao "Exportar .md" (gera arquivo com UUID e METADATA)
- Botao "Duplicar" para prompts de biblioteca (cria copia editavel com novo UUID)
- Visualizacao de historico de versoes (por UUID)
- Editor de workflow (configurar antecessores, sucessores, condicoes)

## Compatibilidade e Migracao

- `ia_generation.prompt` (VARCHAR com slug) permanece para backward compatibility
- Queries de relatorio usam `prompt_id` (JOIN com `ia_prompt`) como caminho primario
- Seeds com prefixo `^` sao convertidos para registros com `library = 'local:./prompts'` e UUID
- `ia_favorite.prompt_id` e `ia_prompt_rating.prompt_base_id` sao migrados para UUID com dados preservados
- Rollback: se necessario, o campo `prompt` em `ia_generation` ainda funciona como fallback
