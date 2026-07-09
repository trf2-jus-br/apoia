import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { z } from "zod"
import { UserType } from "../user"
import { getProcessMetadataTool, getPieceContentTool } from "../ai-tools/tools"
import { getPrecedentTool } from "../ai-tools/tools-juris"
import { getLibraryDocumentTool } from "../ai-tools/tools-library"
import { getPangeaTool } from "../ai-tools/tools-pangea"
import { getSemanticSearchTool } from "../ai-tools/tools-semantic-search"
import { getLeadingCaseSearchTool } from "../ai-tools/tools-leading-case-search"
import { getAddDateTool, getCurrentDateTool, getDateDiffTool } from "../ai-tools/tools-date"
import { getCalculatorTool } from "../ai-tools/tools-calculator"

// Tipo mínimo que extraímos de um tool do AI SDK v6 (description, inputSchema, execute).
// Cada factory tem seu próprio tipo genérico Tool<INPUT, OUTPUT>, então usamos any aqui para
// acomodar todas no mesmo mapa — só acessamos description/inputSchema/execute em runtime.
type ApoiaToolFactory = (pUser: Promise<UserType>) => any

// Mapa nome -> factory de tool. As factories recebem Promise<UserType> e retornam um tool do AI SDK.
// A instância do user só é usada dentro de execute(); description/inputSchema são estáticos.
const TOOL_FACTORIES: Record<string, ApoiaToolFactory> = {
    processMetadata: getProcessMetadataTool,
    piecesText: getPieceContentTool,
    libraryDocument: getLibraryDocumentTool,
    pangea: getPangeaTool,
    semanticSearch: getSemanticSearchTool,
    leadingCaseSearch: getLeadingCaseSearchTool,
    precedent: getPrecedentTool,
    currentDate: getCurrentDateTool,
    dateDiff: getDateDiffTool,
    addDate: getAddDateTool,
    calculator: getCalculatorTool,
}

// Placeholder de user usado apenas para instanciar as factories uma vez em module scope e
// extrair description/inputSchema (que não dependem do user). O execute() nunca é chamado
// com este placeholder — em produção cada chamada reinstancia a factory com o user real.
const DUMMY_PUSER = Promise.resolve({} as UserType)

// Metadados estáticos (nome, descrição, schema zod v3) extraídos uma única vez.
// O inputSchema das tools do apoia é um z.object(...) v3; o MCP SDK aceita zod v3 via zod-compat.
const TOOL_META: { name: string, description: string, inputSchema: z.ZodObject<any> }[] =
    Object.entries(TOOL_FACTORIES).map(([name, factory]) => {
        const t = factory(DUMMY_PUSER) as any
        return { name, description: t.description as string, inputSchema: t.inputSchema as z.ZodObject<any> }
    })

/**
 * Registra as tools do apoia num McpServer do @modelcontextprotocol/sdk.
 *
 * As tools são registradas uma única vez (schemas/descriptions são estáticos). Cada execute
 * resolve o usuário autenticado a partir de extra.authInfo (preenchido pelo withMcpAuth na rota),
 * reinstancia a factory original com aquele usuário e invoca o execute real. Assim, o contexto
 * por-request (court, interop, anonimização) é preservado sem refatorar getTools().
 *
 * O getPrecedent é condicional por court/user; se o usuário não tiver acesso, retorna erro
 * gracioso em vez de lançar exceção (padrão recomendado pelo protocolo MCP).
 */
export const registerApoiaTools = (server: McpServer) => {
    for (const meta of TOOL_META) {
        const factory = TOOL_FACTORIES[meta.name]
        // paramsSchema aceita zod v3 object diretamente (AnySchema = z3.ZodTypeAny | z4.$ZodType).
        // A instância de zod é única no projeto (verificado via npm ls zod), sem conflito.
        server.tool(
            meta.name,
            meta.description,
            meta.inputSchema as unknown as Record<string, z.ZodTypeAny>,
            async (args: any, extra: any) => {
                const user = (extra?.authInfo as AuthInfo | undefined)?.extra?.user as UserType | undefined
                if (!user) {
                    return {
                        content: [{ type: "text" as const, text: "Não autorizado: usuário não autenticado." }],
                        isError: true,
                    }
                }
                try {
                    const toolInstance = factory(Promise.resolve(user)) as any
                    const result = await toolInstance.execute(args)
                    const text = typeof result === "string" ? result : JSON.stringify(result)
                    return { content: [{ type: "text" as const, text }] }
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Erro desconhecido"
                    return {
                        content: [{ type: "text" as const, text: `Erro ao executar ${meta.name}: ${message}` }],
                        isError: true,
                    }
                }
            }
        )
    }
}

/**
 * Retorna metadados estáticos (nome + descrição) das tools expostas pelo servidor MCP.
 * Usado pela página /mcp para listar as tools disponíveis sem precisar instanciar por usuário.
 */
export const getApoiaToolsMetadata = (): { name: string, description: string }[] =>
    TOOL_META.map(({ name, description }) => ({ name, description }))
