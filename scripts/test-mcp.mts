// Cliente de teste e2e para o MCP do apoia.
//
// Roda contra o endpoint HTTP Streamable real (ex.: http://localhost:8081/api/mcp/mcp?token=...),
// exercitando o handshake completo do protocolo MCP (initialize, session-id, notifications/initialized),
// listando as tools e, opcionalmente, chamando processMetadata e piecesText.
//
// Como rodar (Node >= 22, sem dependencias alem do SDK ja instalado):
//   node --experimental-strip-types scripts/test-mcp.mts <URL_MCP> [NUMERO_DO_PROCESSO] [CODIGO_DA_PECA]
//
// Os parâmetros também podem vir de variáveis de ambiente:
//   MCP_TEST_URL            -> URL do endpoint MCP (fallback do 1o argumento)
//   MCP_TEST_PROCESS_NUMBER -> número do processo (fallback do 2o argumento)
//   MCP_TEST_PIECE_ID       -> código/identificador da peça (fallback do 3o argumento)
//
// Exemplo:
//   node --experimental-strip-types scripts/test-mcp.mts \
//     "http://localhost:8081/api/mcp/mcp?token=9e26aade3bba40aX" "5009265282021402510X" "CODIGO_PECA"

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
const pieceId = process.argv[4] || process.env.MCP_TEST_PIECE_ID

if (!url) {
    console.error('Uso: node --experimental-strip-types scripts/test-mcp.mts "<URL_MCP>" "[NUMERO_DO_PROCESSO]" "[CODIGO_DA_PECA]"')
    console.error("     (ou defina MCP_TEST_URL / MCP_TEST_PROCESS_NUMBER / MCP_TEST_PIECE_ID)")
    process.exit(1)
}

const client = new Client({ name: "apoia-mcp-test", version: "1.0.0" })
let connected = false

async function main() {
    console.log(`[1/4] Conectando a ${url} ...`)
    const transport = new StreamableHTTPClientTransport(new URL(url as string))
    try {
        await client.connect(transport)
        connected = true
        console.log("[1/4] Handshake MCP concluido.")
    } catch (error) {
        // 401 aqui normalmente indica token invalido ou expirado.
        const msg = error instanceof Error ? error.message : String(error)
        if (/\b401\b|unauthor|token/i.test(msg)) {
            console.error("[1/4] Falha de autenticacao (401): token invalido ou expirado.")
        }
        throw error
    }

    // --- tools/list ---
    console.log("\n[2/4] Listando tools ...")
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
        console.log("\n[3/4] Numero do processo nao informado: pulando chamada de processMetadata.")
        console.log("      Passe o numero como 2o argumento para chamar a tool.")
        return
    }

    console.log(`\n[3/4] Chamando processMetadata(processNumber="${processNumber}") ...`)
    // callTool retorna uma uniao complexa (multiplos schemas de resultado); para o cliente de
    // teste tratamos o resultado como any nesta parte de impressao.
    const metadataResult: any = await client.callTool({
        name: "processMetadata",
        arguments: { processNumber },
    })

    printToolResult("processMetadata", metadataResult)

    // --- tools/call: piecesText ---
    if (!pieceId) {
        console.log("\n[4/4] Codigo da peca nao informado: pulando chamada de piecesText.")
        console.log("      Passe o codigo como 3o argumento para chamar a tool.")
        return
    }

    console.log(`\n[4/4] Chamando piecesText(processNumber="${processNumber}", pieceIdArray=["${pieceId}"]) ...`)
    const piecesResult: any = await client.callTool({
        name: "piecesText",
        arguments: { processNumber, pieceIdArray: [pieceId] },
    })

    printToolResult("piecesText", piecesResult)
}

// Imprime o resultado de uma chamada de tool (array de content) de forma legivel.
// callTool retorna uma uniao complexa (multiplos schemas de resultado), por isso `any`.
function printToolResult(toolName: string, result: any) {
    if (result.isError) {
        console.error(`${toolName} retornou erro:`)
    } else {
        console.log(`${toolName} retornou:`)
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
