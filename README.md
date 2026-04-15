![alt text](https://github.com/trf2-jus-br/apoia/blob/main/public/apoia-logo-transp.png?raw=true)

# Apoia

Apoia é uma ferramenta de inteligência artificial generativa originalmente desenvolvida para auxiliar na triagem de acervos. Ela analisa documentos de processos e gera resumos das principais peças e gera um relatório sobre acervo.

A Apoia também pode ser utilizada para realizar uma Síntese do Processo on-line, a partir da informação do número do processo.

Outros recursos disponíveis são a geração de ementas conforme Resolução 156/2024 do CNJ e a revisão de textos por inteligência artificial.

Clique [aqui](https://docs.google.com/presentation/d/1XTmGNOI3O3yaBOEXa5A3ViVHlCy4kvB4e0G2qEmmgLo/edit?usp=sharing) para ver uma apresentação da Apoia.

## Funcionalidades

**Integração com Eproc**: Login, consulta processual e obtenção de peças via MNI.

**Integração com IA**: Repositório de prompts, envio e recebimento, limites de acesso.

**Interface com  o Usuário**: Informação do número do processo, apresentação dos resultados em tempo real, processamento de relatórios.

## Arquitetura
- Nodejs 20 LTS
- Desenvolvido em TypeScript, NextJS e Vercel AI SDK
- Compatível com ChatGPT, Claude, Gemini, Llama, etc
- MySQL para gerar relatórios de triagem e armazenar respostas de IA (opcional)
- Pode ser acoplado a qualquer sistema compatível com o MNI
- Sem nenhuma outra dependência

## Configuração

A Apoia requer que diversas variáveis de ambiente sejam informadas. 

No ambiente de desenvolvimento, isso pode ser feito criando um arquivo na raiz do projeto chamado `.env.local`.

Primeiro, indique quais são os sistemas aos quais deseja conectar a Apoia, depois, para cada sistema, informe o endereço do WSDL e do Endpoint do MNI:

**Observação**: caso haja a necessidade de utilizar senhas criptografadas ao enviar as requisições, devemos adicionar a variavél de anbiente `<SYSTEM>_HASH_PASSWORD`

```properties
SYSTEMS=TRF2,JFRJ,JFES
TRF2_MNI_WSDL_URL="https://epr.trf2.jus.br/eproc/wsdl.php?srv=intercomunicacao2.2"
TRF2_MNI_ENDPOINT_URL="https://epr.trf2.jus.br/eproc/ws/controlador_ws.php?srv=intercomunicacao2.2"
JFRJ_MNI_WSDL_URL="https://epr.jfrj.jus.br/eproc/wsdl.php?srv=intercomunicacao2.2"
JFRJ_MNI_ENDPOINT_URL="https://epr.jfrj.jus.br/eproc/ws/controlador_ws.php?srv=intercomunicacao2.2"
JFES_MNI_WSDL_URL="https://epr.jfes.jus.br/eproc/wsdl.php?srv=intercomunicacao2.2"
JFES_MNI_ENDPOINT_URL="https://epr.jfes.jus.br/eproc/ws/controlador_ws.php?srv=intercomunicacao2.2"
JFES_HAS_PASSWORD=true
```

Informe o identificador do modelo de inteligência artificial que deseja utilizar. Outros possíveis seriam: `gpt-4o-mini-2024-07-18`, `claude-3-5-sonnet-20241022` ou qualquer outro suportado pelo framework Vercel AI.

```properties
MODEL=gpt-4o-2024-08-06
```

Forneça a chave da API relativa ao modelo selecionado. Caso nenhuma seja fornecida, a Apoia vai solicitar as chaves ao usuário.

```properties
OPENAI_API_KEY=CHAVE_DE_API_OPENAI (opcional)
ANTHROPIC_API_KEY=CHAVE_DE_API_ANTHROPIC (opcional)
GOOGLE_API_KEY=CHAVE_DE_API_GOOGLE (opcional)
GROQ_API_KEY=CHAVE_DE_API_GROQ (opcional)
```

Sugerimos que a Apoia não tenha acesso a documentos sigilosos. Isso pode ser obtido aplicando a propriedade abaixo:

```properties
CONFIDENTIALITY_LEVEL_MAX=0
```

A Apoia utiliza o framework de autenticação NextAuth, portanto é necessário configurar as propriedades abaixo:

```properties
NEXTAUTH_URL_INTERNAL=http://localhost:8081
NEXTAUTH_URL=http://localhost:8081
NEXTAUTH_SECRET=SUBSTITUIR_POR_UM_UUID_ALEATORIO
```

A API da Apoia funciona com um token JWE, portanto, é necessário configurar as seguintes propriedades:

```properties
JWT_SECRET=SUBSTITUIR_POR_UM_UUID_ALEATORIO
JWT_ISSUER=apoia.trf2.jus.br
JWT_AUDIENCE=apoia.trf2.jus.br
```

Uma encriptação a mais é realizada na senha a partir da chave abaixo:

```properties
PWD_SECRET=SUBSTITUIR_POR_UM_UUID_ALEATORIO
```

## Sincronização de Bibliotecas de Prompts

A Apoia sincroniza automaticamente os prompts do diretório local `prompts/` para o banco de dados na inicialização. Além disso, é possível sincronizar prompts de repositórios Git remotos (GitHub e GitLab).

Para configurar bibliotecas remotas, defina as variáveis abaixo:

```properties
# URLs dos repositórios de prompts, separadas por vírgula
# Appenda #branch para uma branch específica (padrão: main)
PROMPT_LIBRARIES=https://github.com/org/prompts-core,https://gitlab.com/equipe/prompts#develop

# Tokens de acesso para repositórios privados (formato: url=token, separados por vírgula)
# A correspondência é por substring da URL
PROMPT_LIBRARIES_TOKENS=github.com/org/prompts-core=ghp_xxxx,gitlab.com/equipe=glpat-xxxx

# Secret compartilhado para autenticar webhooks
PROMPT_LIBRARY_SECRET=SUBSTITUIR_POR_UM_SECRET_ALEATORIO
```

**Webhook para sincronização automática:** Configure um webhook no GitHub/GitLab apontando para `POST /api/v1/sync/webhook` usando o secret definido em `PROMPT_LIBRARY_SECRET`.

**Validação de prompts:** O endpoint `POST /api/v1/sync/validate` é público e pode ser usado em hooks pre-commit para bloquear commits com prompts inválidos. Veja [docs/formato-arquivo-prompt.md](docs/formato-arquivo-prompt.md) para o guia completo de configuração com husky.

## Inicialização do banco de dados

Para criar o esquema `apoia`, execute os comandos encontrados nos arquivos `mysql/migration` para MySQL e `postgres/migration` para postgres


Para conectar ao MySQL, utilize propriedades como as descritas abaixo:

```properties
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUBSTITUIR_PELA_SENHA_DO_MYSQL
DB_DATABASE=apoia
DB_POOL=2
DB_SSL=
```

Para conectar ao PostgreSQL, utilize siga o padrão abaixo:

```properties
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=SUBSTITUIR_PELA_SENHA_DO_POSTGRESQL
DB_DATABASE=apoia
DB_POOL=2
DB_SSL=
```

> O nome do host e da porta pode variar caso esteja executando a partir de sua máquina, como desenvolvimento a fim de fazer debug, ou caso esteja rodando a aplicação a partir de containers

Se desejar que a Apoia, ao clicar sobre o número de um processo, abra o sistema processual, use a configuração abaixo:

```properties
NAVIGATE_TO_PROCESS_URL=https://balcaojush.jfrj.jus.br/balcaojus/#/processo/{numero}?avisos=0
```


## Executando a Apoia em Modo de Desenvolvimento

1. Faça o [download](https://nodejs.org/en/download/prebuilt-installer) e instale o Node.js ou, se já tiver o Node.js instalado, [atualize o Node.js e o NPM para as últimas versões](https://horadecodar.com.br/como-atualizar-node-e-npm-para-ultima-versao/)

2. Faça o [donwload](https://code.visualstudio.com/download) e instale o VSCode

3. Clone o repositório da Apoia

```shell
$ cd seu-diretorio-de-repositórios
$ git clone https://github.com/trf2-jus-br/apoia
```

4. Abra o VSCode no diretório `seu-diretorio-de-repositórios/apoia` (utilize o menu `File/Open Folder`)

5. Crie o arquivo de configuração conforme explicado acima

6. Abra o terminal no VSCode (utilize o menu `Terminal/New Terminal`) depois instale as dependências com o comando abaixo:

```shell
$ npm install
```

7. Execute a aplicação em modo de desenvolvimento com o comando no terminal:

```shell
$ npm run dev
```

## Fazendo o Deploy em Produção com Docker ou Vercel

1. [Instale o Docker](https://docs.docker.com/get-started/get-docker/) na sua máquina

2. Edite o arquivo `docker-compose.yaml` e ajuste o valor das configurações em `services/apoiaserver/environment`

3. Execute a aplicação e depois aponte o navegador para `http://localhost:8080`

```shell
$ docker-compose up
```

4. Se desejar apenas criar o container do docker, isso pode ser realizado assim:

```shell
$ docker build -t apoiaserver .
```

Caso deseje fazer deploy na nuvem, a Apoia funciona perfeitamente no Vercel, basta indicar o repositório do GitHub e inserir as configurações.