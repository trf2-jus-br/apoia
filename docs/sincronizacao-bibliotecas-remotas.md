# Sincronização de Bibliotecas Remotas

Além dos prompts locais (diretório `prompts/`), o sistema suporta sincronizar prompts de repositórios Git remotos (GitHub e GitLab). Isso permite que equipes distribuídas mantenham bibliotecas de prompts versionadas em repositórios separados.

> Para informações sobre o formato dos arquivos `.md` de prompts, consulte [formato-arquivo-prompt.md](formato-arquivo-prompt.md).

---

## Configuração

Defina a variável de ambiente `PROMPT_LIBRARIES` com as bibliotecas remotas. Cada entrada contém a URL, um prefixo de slug opcional e um token opcional, separados por vírgula. Múltiplas entradas são separadas por ponto-e-vírgula:

```properties
# Formato: url[,slug-prefix[,token]];url2[,prefix2[,token2]]
PROMPT_LIBRARIES=https://github.com/trf2/prompts,trf2,ghp_xxxx;https://gitlab.com/cnj/prompts-core,cnj;https://github.com/org/prompts-extras
```

- Appenda `#branch` à URL para sincronizar uma branch específica (padrão: `main`)
- **Slug prefix**: quando definido, todos os slugs dos prompts dessa biblioteca recebem o prefixo (ex: `analise` → `trf2-analise`). Isso evita conflitos de nomes entre bibliotecas que possuem prompts com o mesmo slug.
- **Token**: para repositórios privados, informe o token de acesso na terceira posição da entrada. Não é necessária uma variável separada.
- **Resolução de workflow**: referências `path:` em predecessors/successors são resolvidas primeiro dentro da mesma biblioteca (pelo slug original, sem prefixo), depois globalmente. Isso permite que os arquivos `.md` referenciem prompts da mesma biblioteca sem precisar saber do prefixo.

---

## Webhook (Sincronização Automática)

Para sincronizar automaticamente quando houver push no repositório, configure um webhook apontando para:

```
POST https://sua-instancia.exemplo.com/api/v1/sync/webhook
```

- **GitHub**: Configure o webhook com `Content type: application/json` e o secret definido em `PROMPT_LIBRARY_SECRET`
- **GitLab**: Configure o webhook com o token secreto (campo "Secret token") igual ao valor de `PROMPT_LIBRARY_SECRET`

### Configuração passo a passo no GitHub

1. Acesse o repositório no GitHub
2. Clique em **Settings** → **Webhooks** → **Add webhook**
3. Preencha o formulário:

   | Campo | Valor |
   |---|---|
   | **Payload URL** | `https://sua-instancia.exemplo.com/api/v1/sync/webhook` |
   | **Content type** | `application/json` |
   | **Secret** | valor de `PROMPT_LIBRARY_SECRET` |
   | **Which events?** | _Just the push event_ |
   | **Active** | marcado |

4. Clique em **Add webhook**. O GitHub enviará um ping inicial — HTTP 200 confirma que o endpoint está acessível.
5. Para verificar entregas, clique em **Recent Deliveries** nas configurações do webhook.

> O handler filtra automaticamente o branch: apenas pushes para o branch configurado em `PROMPT_LIBRARIES` (padrão: `main`) disparam a sincronização. Pushes para outros branches retornam `status: skipped`.

---

## Validação em CI/CD

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

## Bloqueando Commits Inválidos com Pre-Commit Hook

A forma mais eficaz de impedir que prompts inválidos entrem no repositório é usando um **Git hook `pre-commit`**. Diferente de GitHub Actions (que rodam após o push), o hook roda **localmente antes do commit** — se a validação falhar, o commit é bloqueado.

No ecossistema Node.js, o pacote **husky** gerencia Git hooks de forma simples. O script de validação é escrito em JavaScript (Node.js) para garantir compatibilidade entre Windows, macOS e Linux.

### Passo 1 — Inicializar o projeto Node.js (se ainda não for)

No repositório da biblioteca de prompts, inicialize um `package.json`:

```shell
npm init -y
```

### Passo 2 — Instalar o husky

```shell
npm install --save-dev husky
npx husky init
```

Isso cria o diretório `.husky/` e configura o Git para usar hooks desse diretório.

### Passo 3 — Criar o script de validação

Crie o arquivo `validate-prompts.mjs` na raiz do repositório:

```javascript
#!/usr/bin/env node
// validate-prompts.mjs — Valida arquivos .md staged antes do commit
// Cross-platform (Windows, macOS, Linux)

import { execSync } from 'child_process'

const APOIA_URL = process.env.APOIA_VALIDATE_URL
  || 'https://sua-instancia.exemplo.com/api/v1/sync/validate'

// Verifica se há arquivos .md staged — se não houver, pula a validação
const staged = execSync('git diff --cached --name-only --diff-filter=ACM -- "*.md"', { encoding: 'utf-8' }).trim()

if (!staged) {
  console.log('Nenhum arquivo .md alterado, pulando validacao.')
  process.exit(0)
}

// Envia TODOS os .md rastreados para validação (não só os staged),
// para que o endpoint possa detectar UUIDs duplicados entre arquivos.
const allMd = execSync('git ls-files -- "*.md"', { encoding: 'utf-8' }).trim()
const filePaths = allMd.split('\n').filter(Boolean)
console.log(`Validando ${filePaths.length} arquivo(s) .md (${staged.split('\n').filter(Boolean).length} alterado(s))`)

// Lê o conteúdo staged de cada arquivo (do index, não do working copy)
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

  // Primeira linha com o primeiro erro concreto (VS Code exibe em messagebox)
  const allErrors = (result.files || [])
    .flatMap(f => (f.errors || []).map(e => `${f.path}: ${e}`))
  if (allErrors.length) {
    console.error(`ERRO: ${allErrors[0]}`)
    for (const e of allErrors.slice(1)) console.error(`  - ${e}`)
  } else {
    console.error(`ERRO: Validacao falhou (HTTP ${response.status})`)
  }
  for (const file of result.files || []) {
    for (const warn of file.warnings || []) {
      console.warn(`  [aviso] ${file.path}: ${warn}`)
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

### Passo 4 — Configurar o hook pre-commit

Edite o arquivo `.husky/pre-commit`:

```
node validate-prompts.mjs
```

### Passo 5 — Configurar a URL da instância Apoia

Cada desenvolvedor deve definir a variável de ambiente `APOIA_VALIDATE_URL` apontando para a instância Apoia do seu tribunal. Em sistemas Unix (macOS/Linux), adicione ao `.bashrc` ou `.zshrc`:

```shell
export APOIA_VALIDATE_URL=https://sua-instancia.exemplo.com/api/v1/sync/validate
```

No Windows (PowerShell), adicione ao perfil (`$PROFILE`):

```powershell
$env:APOIA_VALIDATE_URL = "https://sua-instancia.exemplo.com/api/v1/sync/validate"
```

Ou defina permanentemente via Painel de Controle > Variáveis de Ambiente do Sistema.

### Resultado

A partir de agora, ao executar `git commit`, o hook:

1. Identifica os arquivos `.md` que estão no stage
2. Envia o conteúdo para o endpoint de validação da Apoia
3. Se a validação falhar (UUID inválido, duplicado, etc.), o commit é **bloqueado** com mensagem de erro detalhada
4. Se todos os arquivos forem válidos, o commit prossegue normalmente

> **Nota:** Hooks do Git são locais — cada desenvolvedor precisa rodar `npm install` uma vez após clonar o repositório para que o husky configure os hooks automaticamente.

---

## Alternativa: Pre-Commit Hook sem Node.js

Se o repositório de prompts não usa Node.js, é possível usar um hook shell puro que depende apenas de `curl` e `perl` — ambos já vêm inclusos no **Git for Windows** e estão disponíveis por padrão em Linux e macOS.

### Passo 1 — Criar o hook

Crie o arquivo `.git/hooks/pre-commit` (ou em um diretório compartilhado via `core.hooksPath`):

```sh
#!/bin/sh
# pre-commit — Valida arquivos .md staged antes do commit
# Dependências: curl + perl (ambos inclusos no Git for Windows)

APOIA_URL="${APOIA_VALIDATE_URL:-http://localhost:8081/api/v1/sync/validate}"

staged=$(git diff --cached --name-only --diff-filter=ACM -- "*.md")
[ -z "$staged" ] && exit 0

# Envia TODOS os .md rastreados (não só staged) para detectar UUIDs duplicados
all_md=$(git ls-files -- "*.md")
count=$(echo "$all_md" | wc -l | tr -d ' ')
changed=$(echo "$staged" | wc -l | tr -d ' ')

# Monta o JSON usando perl (incluso no Git for Windows e em Linux/macOS)
payload=$(echo "$all_md" | perl -e '
  my @entries;
  while (<STDIN>) {
    chomp; my $p = $_;
    my $c = `git show ":$p"`;
    for my $s (\$p, \$c) {
      $$s =~ s/\\/\\\\/g;
      $$s =~ s/"/\\"/g;
      $$s =~ s/\t/\\t/g;
      $$s =~ s/\r/\\r/g;
      $$s =~ s/\n/\\n/g;
    }
    push @entries, qq({"path":"$p","content":"$c"});
  }
  print q({"files":[) . join(",", @entries) . q(]});
')

tmpfile=$(mktemp)
trap "rm -f $tmpfile $tmpfile.req" EXIT

# Grava payload em arquivo para evitar limite de tamanho de argumento do OS
echo "$payload" > "$tmpfile.req"

http_code=$(curl -s -o "$tmpfile" -w '%{http_code}' \
  -X POST "$APOIA_URL" \
  -H "Content-Type: application/json" \
  -d @"$tmpfile.req")

if [ "$http_code" = "200" ]; then
  echo "Validacao OK."
  exit 0
fi

perl -e '
  local $/; my $j = <STDIN>;
  while ($j =~ /"path"\s*:\s*"([^"]+)"[^}]*?"errors"\s*:\s*\[([^\]]*)\]/gs) {
    my ($p, $e) = ($1, $2);
    my @errs = $e =~ /"((?:[^"\\]|\\.)*)"/g;
    next unless @errs;
    print "  $p: $_\n" for @errs;
  }
' < "$tmpfile" 2>/dev/null || cat "$tmpfile"
exit 1
```

### Passo 2 — Tornar executável

Em Linux/macOS:

```shell
chmod +x .git/hooks/pre-commit
```

No Windows (Git Bash), o `chmod` também funciona. Se estiver usando Git para Windows nativo, o arquivo já é executável.

### Passo 3 — Configurar a URL

Defina `APOIA_VALIDATE_URL` conforme descrito na seção anterior (variável de ambiente do sistema ou do perfil do shell).

### Compartilhando o hook com a equipe

Como `.git/hooks/` não é versionado, a forma recomendada é versionar o hook e apontar o Git para ele:

1. Coloque o script em `.githooks/pre-commit` no repositório (versionado)
2. Cada desenvolvedor executa uma vez após clonar:
   ```shell
   git config core.hooksPath .githooks
   ```
3. Adicione essa instrução ao README do repositório para que novos membros configurem ao clonar

> **Nota:** O comando `git config core.hooksPath` funciona em qualquer terminal — cmd, PowerShell, Git Bash, etc.

---

## Bloqueando Merges com GitHub Actions

Como camada adicional de proteção, uma GitHub Action pode validar prompts em pull requests e impedir o merge se houver erros. Diferente do hook local (que pode ser desabilitado por um desenvolvedor), a Action roda no servidor e é obrigatória.

### Passo 1 — Criar o workflow

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

### Passo 2 — Configurar o secret no GitHub

No repositório, vá em **Settings > Secrets and variables > Actions** e crie:

- `APOIA_VALIDATE_URL`: a URL do endpoint de validação da sua instância Apoia (ex: `https://apoia.trf2.jus.br/api/v1/sync/validate`)

### Passo 3 — Ativar branch protection

Em **Settings > Branches > Branch protection rules**, para a branch `main`:

1. Marque **Require a pull request before merging**
2. Marque **Require status checks to pass before merging**
3. Pesquise e adicione o check **Validar Prompts** (ou o nome do job `validate`)

Com isso, pull requests que alterem arquivos `.md` só poderão ser mesclados se a validação passar.

> **Dica:** Use as duas abordagens em conjunto — o hook `pre-commit` dá feedback imediato ao desenvolvedor, e a Action garante que nada passe mesmo se alguém desabilitar o hook local.

---

## Ciclo de Vida das Origens

O motor de sincronização rastreia a **origem** (campo `origin`) de cada prompt no banco de dados. Isso permite comportamentos inteligentes quando bibliotecas são reorganizadas.

### Renomeação de Repositório

Quando um repositório Git é renomeado (ex: `github.com/org/old-name` → `github.com/org/new-name`), a URL muda e a origin registrada no banco fica diferente da nova URL configurada em `PROMPT_LIBRARIES`.

O sistema detecta essa situação automaticamente:

1. Durante a sincronização, ao encontrar um prompt cujo UUID já existe no banco com **outra origin**...
2. Se a origin antiga **não está mais presente** na lista de origens configuradas → trata como **renomeação** e adota a nova origin
3. Se a origin antiga **ainda está configurada** → trata como **conflito real** e bloqueia a importação com erro

Isso significa que basta atualizar a URL em `PROMPT_LIBRARIES` — na próxima sincronização, os prompts são automaticamente migrados para a nova origin.

### Remoção de uma Biblioteca

Quando uma origin é completamente removida de `PROMPT_LIBRARIES`, seus prompts **permanecem ativos** no banco de dados. Eles ficam "órfãos" — não são mais atualizados por sincronização, mas continuam disponíveis para os usuários.

Esse comportamento é intencional e permite cenários avançados como a divisão de bibliotecas.

### Divisão de Biblioteca em Duas

Suponha que a biblioteca `originA` contém 100 prompts e você deseja dividi-la em duas bibliotecas menores:

1. **Remova `originA`** de `PROMPT_LIBRARIES` completamente
   - Os 100 prompts ficam órfãos (ativos, sem origin configurada)

2. **Adicione `originB`** com um subconjunto de 60 prompts (mesmos UUIDs)
   - Na sincronização, o sistema encontra os UUIDs no banco com `originA`
   - Como `originA` não está mais configurada, trata como renomeação → adota `originB`
   - Os 60 prompts agora pertencem a `originB`

3. **Re-adicione `originA`** com os 40 prompts restantes
   - Esses 40 prompts ainda estão órfãos com `origin = originA`
   - A sincronização reconhece a origin e os mantém em `originA`
   - Prompts que existiam em `originA` mas não estão mais no repositório são **desativados**

O resultado final: 60 prompts em `originB`, 40 prompts em `originA`, todos preservando seus UUIDs e histórico de versões.

> **Importante:** A ordem dos passos importa. Se você adicionar ambas as origins simultaneamente sem primeiro remover `originA`, o sistema detectará conflito de UUID entre as duas origens e bloqueará a importação.

### Desativação de Prompts

Dentro de uma origin que está sendo sincronizada, prompts que existiam anteriormente mas **não estão mais presentes** no repositório são automaticamente desativados (`is_latest = 0`). Isso se aplica apenas a prompts cuja origin corresponde exatamente à que está sendo sincronizada — prompts órfãos ou de outras origens não são afetados.
