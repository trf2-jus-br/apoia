// Cliente de teste e2e para o MCP do apoia.
//
// Roda contra o endpoint HTTP Streamable real (ex.: http://localhost:8081/api/mcp/mcp?token=...),
// exercitando o handshake completo do protocolo MCP (initialize, session-id, notifications/initialized),
// listando as tools e, opcionalmente, chamando processMetadata.
//
// Como rodar (Node >= 22, sem dependencias alem do SDK ja instalado):
//   node --experimental-strip-types scripts/test-mcp.mts <URL_MCP> [NUMERO_DO_PROCESSO]
//
// Os parâmetros também podem vir de variáveis de ambiente:
//   MCP_TEST_URL            -> URL do endpoint MCP (fallback do 1o argumento)
//   MCP_TEST_PROCESS_NUMBER -> número do processo (fallback do 2o argumento)
//
// Exemplo:
//   node --experimental-strip-types scripts/test-mcp.mts "http://localhost:8081/api/mcp/mcp?token=9e26aade3bba40aX" "5009265282021402510X"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

// Nomes das tools registradas por registerApoiaTools (lib/mcp/mcp-registry.ts).
// Usado para validar que tools/list devolve o conjunto esperado.
const EXPECTED_TOOLS = [
    "processMetadata",
    "piecesText",
    "libraryDocument",
    "pangea",
    "semanticSearch",
    "leadingCaseSearch",
    "precedent",
    "currentDate",
    "dateDiff",
    "addDate",
    "calculator",
]

const url = process.argv[2] || process.env.MCP_TEST_URL
const processNumber = process.argv[3] || process.env.MCP_TEST_PROCESS_NUMBER

if (!url) {
    console.error('Uso: node --experimental-strip-types scripts/test-mcp.mts "<URL_MCP>" "[NUMERO_DO_PROCESSO]"')
    console.error("     (ou defina MCP_TEST_URL / MCP_TEST_PROCESS_NUMBER)")
    process.exit(1)
}

const client = new Client({ name: "apoia-mcp-test", version: "1.0.0" })
let connected = false

async function main() {
    console.log(`[1/3] Conectando a ${url} ...`)
    const transport = new StreamableHTTPClientTransport(new URL(url as string))
    try {
        await client.connect(transport)
        connected = true
        console.log("[1/3] Handshake MCP concluido.")
    } catch (error) {
        // 401 aqui normalmente indica token invalido ou expirado.
        const msg = error instanceof Error ? error.message : String(error)
        if (/\b401\b|unauthor|token/i.test(msg)) {
            console.error("[1/3] Falha de autenticacao (401): token invalido ou expirado.")
        }
        throw error
    }

    // --- tools/list ---
    console.log("\n[2/3] Listando tools ...")
    const { tools } = await client.listTools()
    for (const tool of tools) {
        console.log(`  - ${tool.name}: ${tool.description ?? "(sem descricao)"}`)
    }
    console.log(`Total retornado: ${tools.length} tool(s).`)

    const found = new Set(tools.map((t) => t.name))
    const missing = EXPECTED_TOOLS.filter((name) => !found.has(name))
    if (missing.length > 0) {
        console.warn(`AVISO: tools esperadas ausentes: ${missing.join(", ")}`)
    } else if (tools.length === EXPECTED_TOOLS.length) {
        console.log("OK: todas as 11 tools esperadas estao presentes.")
    }

    // --- tools/call: processMetadata ---
    if (!processNumber) {
        console.log("\n[3/3] Numero do processo nao informado: pulando chamada de processMetadata.")
        console.log("      Passe o numero como 2o argumento para chamar a tool.")
        return
    }

    console.log(`\n[3/3] Chamando processMetadata(processNumber="${processNumber}") ...`)
    // callTool retorna uma uniao complexa (multiplos schemas de resultado); para o cliente de
    // teste tratamos o resultado como any nesta parte de impressao.
    const result: any = await client.callTool({
        name: "processMetadata",
        arguments: { processNumber },
    })

    if (result.isError) {
        console.error("processMetadata retornou erro:")
    } else {
        console.log("processMetadata retornou:")
    }

    for (const part of result.content) {
        if (part.type === "text") {
            console.log(part.text)
        } else {
            console.log(`(conteudo do tipo ${part.type} omitido)`)
        }
    }
}

main()
    .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error)
        console.error("\nERRO:", msg)
        process.exitCode = 1
    })
    .finally(async () => {
        // Sempre encerra a sessao no servidor, mesmo em caso de erro.
        if (connected) {
            try {
                await client.close()
            } catch {
                // best-effort: ignora falha ao fechar
            }
        }
    })
