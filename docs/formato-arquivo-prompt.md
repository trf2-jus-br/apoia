# Como Escrever Arquivos de Prompt

Este documento explica como criar e editar arquivos `.md` de prompts para o sistema Apoia. Estes arquivos definem instruções para modelos de IA e controlam como elas aparecem e se organizam na interface.

---

## Estrutura Geral do Arquivo

Um arquivo de prompt é dividido em **seções** delimitadas por títulos de nível 1 (`# NOME DA SEÇÃO`). A única seção obrigatória é `METADATA`. As demais são opcionais, dependendo do tipo de prompt.

```
# METADATA
<metadados em formato YAML>

# SYSTEM PROMPT
<instruções de sistema para o modelo de IA>

# PROMPT
<o texto do prompt que será enviado ao modelo>

# JSON SCHEMA
<esquema JSON da resposta esperada (opcional)>

# FORMAT
<instruções adicionais de formato (opcional)>
```

---

## Seção `# METADATA`

Contém os metadados do prompt em formato YAML. Controla visibilidade, filtros, ordenação e integração com outros prompts.

### Exemplo completo

```yaml
# METADATA

uuid: 8c8bac70-1aaa-46fc-90fc-328b19906307
name: Voto
sort: 3
share: publico
target: processo
piece_strategy: mais-relevantes-segunda-instancia
instance: [segundo-grau]
matter: [civel]
scope: [justica-federal]
author: Nome do Autor
grupo:
  slug: minutas-segunda-instancia
  titulo: Minutas de Segunda Instância
context:
  action: minuta-editar
  instance: segundo-grau
predecessors:
  - path: pedidos-fundamentacoes-e-dispositivos
successors:
  - path: chat
```

---

## Referência de Campos

### `uuid` _(obrigatório)_

Identificador único e permanente do prompt. **Nunca altere este valor** após o arquivo ser publicado — ele é usado para rastrear o histórico de versões e manter as referências de workflow.

- Gere um UUID v4 em qualquer gerador online (ex: `uuidgenerator.net`) ou com o comando `uuidgen` no terminal.
- Formato: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

> **Arquivos sem `uuid`** são ignorados pelo mecanismo de sincronização. Isso é intencional para arquivos de uso auxiliar, como snippets de texto reutilizáveis.

---

### `name` _(opcional)_

Nome de exibição do prompt na interface. Se omitido, o sistema usa o nome do arquivo (sem extensão e com formatação automática).

```yaml
name: Minuta de Sentença
```

---

### `sort` _(opcional)_

Número inteiro que controla a ordem de exibição na lista. Números menores aparecem primeiro. Prompts sem `sort` definido aparecem no final, em ordem alfabética.

```yaml
sort: 3
```

---

### `author` _(opcional)_

Texto livre com o nome do autor ou equipe responsável pelo prompt.

```yaml
author: Caroline Tauk/JFRJ
```

---

### `share` _(opcional)_

Controla a visibilidade do prompt para outros usuários. Valor padrão: `padrao`.

| Valor | Descrição |
|-------|-----------|
| `padrao` | Visibilidade padrão do sistema — segue as regras gerais (normalmente visível apenas dentro da instalação) |
| `publico` | Visível para todos os usuários |
| `em-analise` | Em revisão pela moderação; visível para moderadores |
| `beta-teste` | Disponível apenas para usuários de beta |
| `nao-listado` | Não aparece nas listas, mas pode ser acessado diretamente via link |
| `privado` | Visível apenas para quem criou |
| `oculto` | Completamente oculto — não aparece em nenhuma lista, nem para administradores. Reservado para prompts internos do sistema |

```yaml
share: publico
```

> `oculto` é gerenciado automaticamente pelo sistema e não deve ser usado em prompts criados por usuários. Ele aparece no formulário de edição como informação somente-leitura quando já está definido.

---

### `target` _(opcional)_

Define o tipo de entrada sobre o qual o prompt opera. Valor padrão: `processo`.

| Valor | Descrição |
|-------|-----------|
| `processo` | Opera sobre peças de um processo judicial |
| `texto` | Opera sobre um texto livre fornecido pelo usuário |
| `refinamento` | Refina ou melhora um texto já gerado |
| `chat` | Modo de conversa interativa |

```yaml
target: processo
```

---

### `piece_strategy` _(opcional)_

Define qual estratégia de seleção de peças do processo será usada. Relevante apenas quando `target: processo`.

| Valor | Descrição |
|-------|-----------|
| `mais-relevantes` | Peças mais relevantes (estratégia geral) |
| `mais-relevantes-primeira-instancia` | Peças mais relevantes de processos de primeiro grau |
| `mais-relevantes-segunda-instancia` | Peças mais relevantes de processos de segundo grau |
| `apelacao-e-triagem` | Focada em apelações e triagem |
| `viabilidade-recurso-extraordinario` | Voltada para análise de viabilidade de RE |
| `viabilidade-recurso-especial` | Voltada para análise de viabilidade de REsp |
| `peticao-inicial` | Foca na petição inicial |
| `peticao-inicial-e-anexos` | Petição inicial e seus anexos |
| `conhecimento` | Fase de conhecimento |
| `tipos-especificos` | Seleciona tipos de peça especificados separadamente |
| `todas` | Inclui todas as peças disponíveis |

```yaml
piece_strategy: mais-relevantes-segunda-instancia
```

---

### `instance` _(opcional)_

Lista de instâncias para as quais o prompt é aplicável. Filtra o prompt na interface conforme o processo selecionado.

| Valor | Descrição |
|-------|-----------|
| `primeiro-grau` | Primeiro grau |
| `segundo-grau` | Segundo grau (tribunais) |
| `terceiro-grau` | Terceiro grau (STJ, STF) |

Aceita um ou mais valores em lista YAML:

```yaml
instance: [segundo-grau]
```

```yaml
instance: [primeiro-grau, segundo-grau]
```

---

### `scope` _(opcional)_

Lista de ramos da Justiça para os quais o prompt é aplicável.

| Valor | Descrição |
|-------|-----------|
| `supremo-tribunal-federal` | STF |
| `superior-tribunal-justica` | STJ |
| `conselho-nacional-justica` | CNJ |
| `justica-federal` | Justiça Federal |
| `justica-estadual` | Justiça Estadual |
| `justica-trabalho` | Justiça do Trabalho |
| `justica-eleitoral` | Justiça Eleitoral |
| `justica-militar-uniao` | Justiça Militar da União |

```yaml
scope: [justica-federal, justica-estadual]
```

---

### `matter` _(opcional)_

Lista de matérias jurídicas para as quais o prompt é aplicável.

| Valor | Descrição |
|-------|-----------|
| `civel` | Cível |
| `criminal` | Criminal |
| `eleitoral` | Eleitoral |
| `trabalhista` | Trabalhista |

```yaml
matter: [civel]
```

---

### `grupo` _(opcional)_

Agrupa prompts relacionados em uma seção visual na interface. Todos os prompts com o mesmo `slug` aparecem juntos sob o mesmo `titulo`.

```yaml
grupo:
  slug: admissibilidade-de-recursos
  titulo: Admissibilidade de Recursos
```

- `slug`: identificador do grupo (letras minúsculas, hífens, sem acentos)
- `titulo`: texto exibido como cabeçalho do grupo na interface

---

### `context` _(opcional)_

Controla quando o prompt aparece automaticamente no painel lateral (Sidekick), baseado no contexto da tela atual do usuário.

```yaml
context:
  action: minuta-editar
  instance: segundo-grau
```

| Subcampo | Descrição | Valores aceitos |
|----------|-----------|-----------------|
| `action` | Ação da interface que ativa o prompt | `minuta-editar`, `processo-selecionar` |
| `instance` | Instância do processo que ativa o prompt | mesmos valores de `instance` acima |

Ambos os subcampos são opcionais — você pode especificar apenas `action`, apenas `instance`, ou ambos.

**Exemplo — prompt visível ao editar minutas de segundo grau:**
```yaml
context:
  action: minuta-editar
  instance: segundo-grau
```

**Exemplo — prompt visível ao selecionar qualquer processo:**
```yaml
context:
  action: processo-selecionar
```

---

### `plugins` _(opcional)_

Lista de plugins ativados para este prompt. Os plugins adicionam funcionalidades extras à execução.

| Valor | Descrição |
|-------|----------|
| `triagem` | Plugin de triagem |
| `normas` | Extração de normas citadas |
| `palavras-chave` | Extração de palavras-chave |
| `triagem-json` | Triagem com saída em JSON |
| `normas-json` | Normas com saída em JSON |
| `palavras-chave-json` | Palavras-chave com saída em JSON |

```yaml
plugins:
  - triagem-json
  - normas
```

---

### `batch_report` _(opcional)_

Indica que este prompt pode ser utilizado em relatórios de lote (batch). Quando `true`, o prompt aparece como opção no processamento em lote de múltiplos processos.

```yaml
batch_report: true
```

---

### `summary` _(opcional)_

Controla se o prompt gera um resumo exibido na interface. Aceita `SIM` ou `NAO` (também aceita variantes como `true`/`false`, `yes`/`no` no YAML — o sistema normaliza automaticamente).

```yaml
summary: SIM
```

---

### `editor_label` _(opcional)_

Texto curto exibido no editor quando este prompt é selecionado como opção. Útil para diferenciar prompts com nomes semelhantes no contexto do editor.

```yaml
editor_label: Minuta de Voto
```

---

### `piece_descr` _(opcional)_

Lista de tipos de peça processual associados a este prompt. Usado quando `piece_strategy: tipos-especificos` para indicar exatamente quais peças devem ser selecionadas. Os valores são as chaves do enum de tipos de peça, podendo ser escritas na forma canônica ou com hífens (slug).

Exemplos de valores aceitos: `peticao-inicial`, `contestacao`, `sentenca`, `apelacao`, `recurso-especial`, `PETICAO_INICIAL`, `CONTESTACAO`, etc.

```yaml
piece_descr:
  - peticao-inicial
  - contestacao
  - sentenca
```

---

### `predecessors` _(opcional)_

Lista de prompts que devem ser executados **antes** deste. O sistema usa essa informação para sugerir a ordem de execução em workflows.

Cada item pode referenciar outro prompt por `path` (slug do arquivo, sem extensão) ou por `uuid`:

```yaml
predecessors:
  - path: pedidos-fundamentacoes-e-dispositivos
  - path: pesquisa-de-temas
```

```yaml
predecessors:
  - uuid: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
```

O `path` é o nome do arquivo sem extensão, relativo ao diretório raiz que está sendo importado. Para arquivos em subpastas, use o caminho relativo:

```yaml
predecessors:
  - path: admissibilidade-de-recurso/juizo-viabilidade-recurso
```

Campos adicionais opcionais por predecessor:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome de exibição (se diferente do padrão) |
| `optional` | boolean | Se `true`, o predecessor não é obrigatório |
| `condition` | string | Condição lógica para incluir este predecessor |

---

### `successors` _(opcional)_

Lista de prompts sugeridos como **próximo passo** após a execução deste. Aparecem como sugestão ao usuário ao final da geração.

```yaml
successors:
  - path: chat
  - path: voto
```

A sintaxe é idêntica à de `predecessors`.

---

## Seção `# SYSTEM PROMPT`

Instrução de sistema enviada ao modelo de IA antes do prompt do usuário. Define o papel, tom, restrições e expertise esperados do modelo.

```
# SYSTEM PROMPT

Você é um assistente de magistrado altamente experiente, especialista em Direito Civil e Processual Civil.
Sua principal habilidade é redigir minutas de votos claras, bem fundamentadas e tecnicamente impecáveis.
```

---

## Seção `# PROMPT`

O texto principal do prompt, enviado como mensagem do usuário ao modelo. Suporta Markdown e variáveis de template.

```
# PROMPT

Com base nas peças do processo abaixo, elabore um resumo dos principais pedidos da parte autora:

{{textos}}
```

### Variáveis de template

| Variável | Descrição |
|----------|-----------|
| `{{textos}}` | Substituída pelo texto extraído das peças do processo selecionadas |
| `{{salvaguardas}}` | Insere o texto padrão de salvaguardas e limitações do sistema |

---

## Seção `# JSON SCHEMA` _(opcional)_

Define o esquema JSON da resposta esperada do modelo, quando o prompt deve retornar dados estruturados em vez de texto livre. O sistema usa este schema para validar e processar a resposta.

```
# JSON SCHEMA

{
  "type": "object",
  "properties": {
    "pedidos": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

## Seção `# FORMAT` _(opcional)_

Template [Nunjucks](https://mozilla.github.io/nunjucks/) que transforma o JSON retornado pelo modelo em texto formatado para exibição ao usuário. É necessário sempre que o prompt usa `# JSON SCHEMA`, pois o JSON bruto não é exibido diretamente — ele precisa ser renderizado em Markdown, tabela ou qualquer outra estrutura legível.

**Fluxo de execução:**

1. O modelo retorna um JSON (validado pelo `# JSON SCHEMA`)
2. O sistema interpreta o `# FORMAT` como um template Nunjucks, passando os campos do JSON como variáveis de contexto
3. O resultado renderizado é exibido ao usuário

### Sintaxe de expressões

Há duas formas de inserir o valor de um campo do JSON no template:

| Sintaxe | Comportamento |
|---------|---------------|
| `{{ campo }}` | Insere o valor **com destaque visual** (span de highlight), indicando ao leitor que a informação foi extraída do JSON |
| `{= campo =}` | Insere o valor **sem destaque**, de forma transparente no texto |

Use `{{ }}` quando quiser que o usuário identifique facilmente que aquele trecho veio da análise do modelo. Use `{= =}` quando o valor deve aparecer como parte natural do texto, sem marcação.

```
{{ campo }}             → valor do campo, com highlight
{= campo =}            → valor do campo, sem highlight
{= objeto.subcampo =}  → acesso aninhado
{= array[0] =}         → primeiro elemento
```

Para blocos de controle (condicionais, laços), use a sintaxe `{% %}` normalmente:

```
{% if condicao %}...{% endif %}
{% for item in lista %}...{% endfor %}
{% set mapa = { CHAVE: 'valor' } %}
```

### Filtros disponíveis

Além dos filtros padrão do Nunjucks, estão disponíveis:

| Filtro | Descrição |
|--------|-----------|
| `sortByDate(campo, ordem)` | Ordena um array por um campo de data no formato `DD/MM/YYYY`. `ordem` pode ser `'asc'` (padrão) ou `'desc'` |
| `blockquoteLines` | Escapa o texto e formata cada linha com `>` (blockquote Markdown) |

### Funções de data disponíveis

As seguintes funções ficam disponíveis no contexto do template:

| Função | Descrição |
|--------|-----------|
| `date('DD/MM/YYYY')` | Converte uma string de data |
| `dateAddDays(data, n)` | Adiciona `n` dias a uma data |
| `dateAddMonths(data, n)` | Adiciona `n` meses a uma data |

### Exemplos

**Lista numerada simples** (arquivo `indice.md`):

```nunjucks
# FORMAT

{% for d in indice %}
{{ loop.index }}. **{= d.descr =}** (evento {= d.event =}{% if d.label %}, {= d.label =}{% endif %}{% if d.pages %}, pág. {= d.pages =}{% endif %})
{% endfor %}
```

**Tabela Markdown** (arquivo `linha-do-tempo-fatica.md`):

```nunjucks
# FORMAT

{% if Linha_Do_Tempo | length %}
| Data | Agente | Fato | Peça |
|------|--------|------|------|
{% for fato in Linha_Do_Tempo %}| {= fato.Tx_Data_Do_Fato =} | {= fato.Tx_Agente or "" =} | {= fato.Tx_Fato_Resumido =} | {= fato.Tx_Peca =} |
{% endfor %}{% endif %}
```

**Mapeamento de enum para texto legível** (arquivo `pedidos-fundamentacoes-e-dispositivos.md`):

```nunjucks
# FORMAT

{% set tipos = {
    CONDENAR_A_PAGAR: 'Condenar a Pagar',
    CONDENAR_A_FAZER: 'Condenar a Fazer',
    ANULAR_RELACAO_JURIDICA: 'Anular Relação Jurídica'
} %}
{% for d in pedidos %}{{ loop.index }}. {{ tipos[d.tipoDePedido] }}: {= d.texto =}
{% endfor %}
```

**Tabela com ordenação por data** (arquivo `prev-ppp.md`):

```nunjucks
# FORMAT

{% if PPP | length %}
| Início | Fim | Empresa | Profissão |
|--------|-----|---------|-----------|
{% for ppp in PPP | sortByDate('Dt_Inicio') %}| {= ppp.Dt_Inicio =} | {= ppp.Dt_Fim =} | {= ppp.Tx_Empresa =} | {= ppp.Tx_Profissao =} |
{% endfor %}{% endif %}
```

> **Importante:** O `# FORMAT` só é executado quando a resposta do modelo começa com `{` (ou seja, é JSON). Se o modelo retornar texto livre, o FORMAT é ignorado e o texto bruto é exibido diretamente.

---

## Seção `## FIELDS` e `## FIELDS READONLY` _(opcional)_

O recurso **auto-json** permite definir a estrutura dos campos de extração diretamente no corpo do `# PROMPT`, usando headings Markdown como definição de schema. O sistema lê esses headings, gera automaticamente o `# JSON SCHEMA` correspondente e injeta o boilerplate de instruções de preenchimento para o modelo.

O resultado é que o autor do prompt escreve apenas uma vez — as descrições dos campos servem simultaneamente como instrução para o modelo e como definição do schema JSON.

**Diferença entre os dois títulos:**

| Título | Comportamento |
|--------|---------------|
| `## FIELDS` | Após o modelo retornar o JSON, a interface exibe os dados em um formulário **editável** — o usuário pode corrigir os valores antes de prosseguir |
| `## FIELDS READONLY` | Os dados extraídos são exibidos mas **não editáveis** pelo usuário |

### Estrutura dos headings

Os headings de nível H3 a H6 abaixo do marcador definem a hierarquia do JSON. O nível hierárquico determina o tipo:

| Nível | Tipo inferido | Exemplo |
|-------|--------------|---------|
| H3–H5 sem `[]` | Objeto aninhado | `### Endereco` |
| H3–H5 com `[]` | Array de objetos | `### Itens[]` |
| H6 | Campo primitivo | `###### Tx_Nome` |

O tipo primitivo de cada campo H6 é inferido pelo **prefixo do nome**:

| Prefixo | Tipo | Formato |
|---------|------|---------|
| `Tx_` | string curta | texto livre (máx. 300 caracteres) |
| `Tg_` | string longa | texto livre, múltiplas linhas |
| `Dt_` | date (string) | `dd/mm/yyyy` |
| `Ma_` | string | mês/ano `mm/aaaa` |
| `Nr_` | number | número |
| `Lo_` | boolean | `true` / `false` |
| `Ev_` | string | número de evento processual |
| (outros) | string | inferido por palavras como "texto", "resumo" |

O texto em itálico após o traço no nome do heading (`### PPP[] - Perfis Profissiográficos`) vira o rótulo de exibição; o texto antes do traço vira o nome do campo no JSON.

### Exemplo — campo simples e array

```markdown
# PROMPT

Extraia as informações do processo abaixo.

## FIELDS

### Processo - Dados do Processo

###### Tx_Numero - Número do Processo
- Número do processo no formato CNJ

###### Dt_Distribuicao - Data de Distribuição
- Data de distribuição no formato dd/mm/yyyy

### Partes[] - Partes do Processo

###### Tx_Nome - Nome
- Nome completo da parte

###### Tx_Polo - Polo
- "Ativo" ou "Passivo"
```

Isso gera automaticamente o JSON schema equivalente a:

```json
{
  "Processo": {
    "Tx_Numero": "...",
    "Dt_Distribuicao": "..."
  },
  "Partes": [
    { "Tx_Nome": "...", "Tx_Polo": "..." }
  ]
}
```

### Exemplo real — array com objeto agrupador (arquivo `prev-ppp.md`)

```markdown
## FIELDS

### Docs_Analisados - Documentos Analisados

###### Nr_PPPs - Número de PPPs
- Número de PPPs extraídos dos documentos

### PPP[] - Perfis Profissiográficos Previdenciários
- Extraia as informações dos textos dos PPPs nos autos
- Se não houver PPPs, responda com um array vazio.

###### Ev_Event - Evento
- Número do evento processual

###### Dt_Inicio - Início do Período
- Data de início conforme consta no PPP ou "?" se não tiver certeza.

###### Tx_Empresa - Empresa
- Nome da empresa

###### Lo_EPI_Eficaz - EPI Eficaz
- true se o EPI foi considerado eficaz no PPP
```

### Exemplo com hierarquia de arrays (`pedidos-viabilidade-recurso.md`)

Arrays podem conter sub-arrays usando H4 e H5:

```markdown
## FIELDS READONLY

### Pedidos[] - Lista de Pedidos

#### Tx_Texto - Texto do Pedido
- Descrição concisa do pedido

##### Argumentos[] - Lista de Argumentos

###### Tx_Texto - Texto do Argumento
- Descrição concisa do argumento

###### Tx_Trecho - Trecho Comprobatório
- Trecho exato do texto onde o argumento aparece
```

### Regras de aninhamento

- H3 na raiz → campo ou array de nível raiz  
- H4 dentro de H3 → subcampo ou subarray  
- H5 dentro de H4 → subsubcampo ou subsubarray  
- **H6 é sempre campo primitivo** — não pode ter filhos nem ser array  
- Nomes de campos no mesmo nível devem ser únicos  
- Descrições (linhas de texto após o heading) tornam-se instrução para o modelo e não entram no schema JSON

> O `## FIELDS` é usado dentro da seção `# PROMPT`. O sistema injeta automaticamente o boilerplate de instruções gerais (tipos de dados, formatos de data, regras de preenchimento) antes do título, de modo que o autor não precisa repeti-las.

---

## Exemplos Completos

### Prompt simples de análise de processo

```markdown
# METADATA

uuid: 9c8f98fb-0679-4f2a-9722-91c2e1b35600
name: Resumos e Análise
sort: 2
piece_strategy: mais-relevantes
context:
  action: processo-selecionar
successors:
  - path: chat

# SYSTEM PROMPT

Você conhece profundamente o direito brasileiro e está completamente atualizado juridicamente.
Você sempre presta informações precisas, objetivas e confiáveis.
Você não está autorizado a criar nada; suas respostas devem ser baseadas apenas no texto fornecido.

# PROMPT

Leia com atenção os textos a seguir e resuma as informações mais importantes:

{{textos}}
```

---

### Prompt de segúnda instância com workflow completo

```markdown
# METADATA

uuid: 8c8bac70-1aaa-46fc-90fc-328b19906307
name: Voto
sort: 3
piece_strategy: mais-relevantes-segunda-instancia
instance: [segundo-grau]
context:
  action: minuta-editar
  instance: segundo-grau
predecessors:
  - path: pedidos-fundamentacoes-e-dispositivos
successors:
  - path: chat

# SYSTEM PROMPT

Você é um assistente de magistrado altamente experiente, especialista em Direito Civil e Processual Civil.

# PROMPT

Considerando as informações do processo em questão, gere uma minuta completa de voto de mérito.

{{textos}}
```

---

### Prompt com grupo e share restrito

```markdown
# METADATA

uuid: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
name: Minuta de Decisão de Viabilidade de Recurso Especial
sort: 3
share: beta-teste
piece_strategy: viabilidade-recurso-especial
grupo:
  slug: admissibilidade-de-recursos
  titulo: Admissibilidade de Recursos
predecessors:
  - path: pedidos-viabilidade-recurso
  - path: pesquisa-de-temas
  - path: juizo-viabilidade-recurso
successors:
  - path: chat

# SYSTEM PROMPT

...

# PROMPT

...
```

---

### Prompt de subpasta com scope específico

```markdown
# METADATA

uuid: b01fed52-428c-47b1-aa7b-228be3b63ba4
name: Relatório de Aposentadoria Especial - Segunda Instância
sort: 1000
piece_strategy: mais-relevantes-segunda-instancia
author: Caroline Tauk/JFRJ
instance: [segundo-grau]
scope: [justica-federal]
matter: [civel]
successors:
  - path: pedidos-fundamentacoes-e-dispositivos
  - path: voto
  - path: chat

# SYSTEM PROMPT

...

# PROMPT

...
```

---

## Boas Práticas

1. **Nunca altere o `uuid`** de um prompt já publicado. Isso quebraria as referências de workflow e o histórico de versões.

2. **Use slugs legíveis** ao referenciar prompts por `path`. O slug é o nome do arquivo sem `.md` e em letras minúsculas com hífens.

3. **Mantenha o system prompt curto e focado**. Defina papel e restrições; os detalhes da tarefa vão no `# PROMPT`.

4. **Use `{{textos}}`** no corpo do prompt quando o modelo precisar ler o conteúdo do processo. Sem essa variável, nenhum texto do processo será enviado.

5. **Use `sort` para organizar**. Prompts mais usados devem ter números menores (aparecem primeiro).

6. **Defina `instance` e `scope`** quando o prompt for específico para um tipo de tribunal ou grau — isso evita que apareça em contextos irrelevantes e melhora a experiência do usuário.

7. **Use `share: privado`** durante o desenvolvimento para que o prompt fique visível apenas para você antes de ser publicado.

---

## Sincronização de Bibliotecas Remotas

Além dos prompts locais (diretório `prompts/`), o sistema suporta sincronizar prompts de repositórios Git remotos (GitHub e GitLab). Isso permite que equipes distribuídas mantenham bibliotecas de prompts versionadas em repositórios separados.

### Configuração

Defina a variável de ambiente `PROMPT_LIBRARIES` com as bibliotecas remotas. Cada entrada contém a URL, um prefixo de slug opcional e um token opcional, separados por vírgula. Múltiplas entradas são separadas por ponto-e-vírgula:

```properties
# Formato: url[,slug-prefix[,token]];url2[,prefix2[,token2]]
PROMPT_LIBRARIES=https://github.com/trf2/prompts,trf2,ghp_xxxx;https://gitlab.com/cnj/prompts-core,cnj;https://github.com/org/prompts-extras
```

- Appenda `#branch` à URL para sincronizar uma branch específica (padrão: `main`)
- **Slug prefix**: quando definido, todos os slugs dos prompts dessa biblioteca recebem o prefixo (ex: `analise` → `trf2-analise`). Isso evita conflitos de nomes entre bibliotecas que possuem prompts com o mesmo slug.
- **Token**: para repositórios privados, informe o token de acesso na terceira posição da entrada. Não é necessária uma variável separada.
- **Resolução de workflow**: referências `path:` em predecessors/successors são resolvidas primeiro dentro da mesma biblioteca (pelo slug original, sem prefixo), depois globalmente. Isso permite que os arquivos `.md` referenciem prompts da mesma biblioteca sem precisar saber do prefixo.

### Webhook (Sincronização Automática)

Para sincronizar automaticamente quando houver push no repositório, configure um webhook apontando para:

```
POST https://sua-instancia.exemplo.com/api/v1/sync/webhook
```

- **GitHub**: Configure o webhook com `Content type: application/json` e o secret definido em `PROMPT_LIBRARY_SECRET`
- **GitLab**: Configure o webhook com o token secreto (campo "Secret token") igual ao valor de `PROMPT_LIBRARY_SECRET`

### Validação em CI/CD

Para validar prompts antes de fazer merge, use o endpoint de validação:

```
POST https://sua-instancia.exemplo.com/api/v1/sync/validate
Content-Type: application/json

{
  "files": [
    { "path": "analise.md", "content": "<conteúdo do arquivo>" }
  ]
}
```

O endpoint é público e não requer autenticação — a operação é puramente de leitura, sem efeitos colaterais no banco de dados.

A resposta indica se os arquivos são válidos (UUIDs corretos, sem duplicatas, referências de workflow resolvidas, etc.). Retorna HTTP 200 se tudo estiver correto, ou 422 com detalhes dos erros.

---

### Bloqueando Commits Inválidos com Pre-Commit Hook

A forma mais eficaz de impedir que prompts inválidos entrem no repositório é usando um **Git hook `pre-commit`**. Diferente de GitHub Actions (que rodam após o push), o hook roda **localmente antes do commit** — se a validação falhar, o commit é bloqueado.

No ecossistema Node.js, o pacote **husky** gerencia Git hooks de forma simples. O script de validação é escrito em JavaScript (Node.js) para garantir compatibilidade entre Windows, macOS e Linux.

#### Passo 1 — Inicializar o projeto Node.js (se ainda não for)

No repositório da biblioteca de prompts, inicialize um `package.json`:

```shell
npm init -y
```

#### Passo 2 — Instalar o husky

```shell
npm install --save-dev husky
npx husky init
```

Isso cria o diretório `.husky/` e configura o Git para usar hooks desse diretório.

#### Passo 3 — Criar o script de validação

Crie o arquivo `validate-prompts.mjs` na raiz do repositório:

```javascript
#!/usr/bin/env node
// validate-prompts.mjs — Valida arquivos .md staged antes do commit
// Cross-platform (Windows, macOS, Linux)

import { execSync } from 'child_process'

const APOIA_URL = process.env.APOIA_VALIDATE_URL
  || 'https://sua-instancia.exemplo.com/api/v1/sync/validate'

// Coleta os arquivos .md que estão staged para commit
const staged = execSync('git diff --cached --name-only --diff-filter=ACM -- "*.md"', { encoding: 'utf-8' }).trim()

if (!staged) {
  console.log('Nenhum arquivo .md alterado, pulando validacao.')
  process.exit(0)
}

const filePaths = staged.split('\n').filter(Boolean)
console.log(`Validando ${filePaths.length} arquivo(s): ${filePaths.join(', ')}`)

// Lê o conteúdo staged de cada arquivo (não o working copy, mas o que está no index)
const files = filePaths.map(filePath => ({
  path: filePath,
  content: execSync(`git show ":${filePath}"`, { encoding: 'utf-8' }),
}))

// Envia para o endpoint de validação
try {
  const response = await fetch(APOIA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  })

  const result = await response.json()

  if (response.ok) {
    console.log('Validacao OK: todos os prompts sao validos.')
    process.exit(0)
  }

  console.error(`ERRO: Validacao falhou (HTTP ${response.status})`)
  for (const file of result.files || []) {
    if (file.errors?.length) {
      console.error(`  ${file.path}:`)
      for (const err of file.errors) console.error(`    - ${err}`)
    }
    for (const warn of file.warnings || []) {
      console.warn(`    [aviso] ${warn}`)
    }
  }
  process.exit(1)
} catch (err) {
  console.error(`ERRO: Nao foi possivel conectar ao endpoint de validacao: ${err.message}`)
  console.error(`URL: ${APOIA_URL}`)
  console.error('Verifique se a variavel APOIA_VALIDATE_URL esta configurada corretamente.')
  process.exit(1)
}
```

#### Passo 4 — Configurar o hook pre-commit

Edite o arquivo `.husky/pre-commit`:

```
node validate-prompts.mjs
```

#### Passo 5 — Configurar a URL da instância Apoia

Cada desenvolvedor deve definir a variável de ambiente `APOIA_VALIDATE_URL` apontando para a instância Apoia do seu tribunal. Em sistemas Unix (macOS/Linux), adicione ao `.bashrc` ou `.zshrc`:

```shell
export APOIA_VALIDATE_URL=https://sua-instancia.exemplo.com/api/v1/sync/validate
```

No Windows (PowerShell), adicione ao perfil (`$PROFILE`):

```powershell
$env:APOIA_VALIDATE_URL = "https://sua-instancia.exemplo.com/api/v1/sync/validate"
```

Ou defina permanentemente via Painel de Controle > Variáveis de Ambiente do Sistema.

#### Resultado

A partir de agora, ao executar `git commit`, o hook:

1. Identifica os arquivos `.md` que estão no stage
2. Envia o conteúdo para o endpoint de validação da Apoia
3. Se a validação falhar (UUID inválido, duplicado, etc.), o commit é **bloqueado** com mensagem de erro detalhada
4. Se todos os arquivos forem válidos, o commit prossegue normalmente

> **Nota:** Hooks do Git são locais — cada desenvolvedor precisa rodar `npm install` uma vez após clonar o repositório para que o husky configure os hooks automaticamente.

---

### Bloqueando Merges com GitHub Actions

Como camada adicional de proteção, uma GitHub Action pode validar prompts em pull requests e impedir o merge se houver erros. Diferente do hook local (que pode ser desabilitado por um desenvolvedor), a Action roda no servidor e é obrigatória.

#### Passo 1 — Criar o workflow

No repositório de prompts, crie o arquivo `.github/workflows/validate-prompts.yml`:

```yaml
name: Validar Prompts

on:
  pull_request:
    paths:
      - '**.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Coletar arquivos .md alterados
        id: changed
        run: |
          FILES=$(gh pr diff ${{ github.event.pull_request.number }} --name-only | grep '\.md$' || true)
          echo "files<<EOF" >> $GITHUB_OUTPUT
          echo "$FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Validar prompts
        if: steps.changed.outputs.files != ''
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Executar validação
        if: steps.changed.outputs.files != ''
        run: |
          node -e "
          const fs = require('fs');
          const files = process.env.CHANGED_FILES.split('\n').filter(f => f.trim());
          if (!files.length) { console.log('Sem arquivos .md para validar'); process.exit(0); }

          const payload = files.map(f => ({
            path: f,
            content: fs.readFileSync(f, 'utf-8'),
          }));

          fetch(process.env.APOIA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: payload }),
          })
          .then(async r => {
            const result = await r.json();
            if (r.ok) { console.log('Validacao OK'); process.exit(0); }
            console.error('Validacao falhou:');
            for (const f of result.files || []) {
              for (const e of f.errors || []) console.error('  ' + f.path + ': ' + e);
              for (const w of f.warnings || []) console.warn('  ' + f.path + ': [aviso] ' + w);
            }
            process.exit(1);
          })
          .catch(e => { console.error('Erro de conexao:', e.message); process.exit(1); });
          "
        env:
          CHANGED_FILES: ${{ steps.changed.outputs.files }}
          APOIA_URL: ${{ secrets.APOIA_VALIDATE_URL }}
```

#### Passo 2 — Configurar o secret no GitHub

No repositório, vá em **Settings > Secrets and variables > Actions** e crie:

- `APOIA_VALIDATE_URL`: a URL do endpoint de validação da sua instância Apoia (ex: `https://apoia.trf2.jus.br/api/v1/sync/validate`)

#### Passo 3 — Ativar branch protection

Em **Settings > Branches > Branch protection rules**, para a branch `main`:

1. Marque **Require a pull request before merging**
2. Marque **Require status checks to pass before merging**
3. Pesquise e adicione o check **Validar Prompts** (ou o nome do job `validate`)

Com isso, pull requests que alterem arquivos `.md` só poderão ser mesclados se a validação passar.

> **Dica:** Use as duas abordagens em conjunto — o hook `pre-commit` dá feedback imediato ao desenvolvedor, e a Action garante que nada passe mesmo se alguém desabilitar o hook local.
