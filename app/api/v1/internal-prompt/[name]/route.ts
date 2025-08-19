import { getInternalPrompt } from '@/lib/ai/prompt'
import { PromptDefinitionType } from '@/lib/ai/prompt-types'

// Allow streaming responses up to 30 seconds
export const maxDuration = 60

/**
 * @swagger
 *
 * /api/v1/internal-prompt/{name}:
 *   get:
 *     description: Retorna a definição interna de um prompt pelo nome.
 *     tags:
 *       - ai
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome interno do prompt (chat, analise, indice, linguagem-simples, etc.)
 *     responses:
 *       200:
 *         description: Definição interna do prompt (PromptDefinitionType)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kind:
 *                   type: string
 *                 systemPrompt:
 *                   type: string
 *                 prompt:
 *                   type: string
 *                 jsonSchema:
 *                   type: string
 *                 format:
 *                   type: string
 *                 template:
 *                   type: string
 *                 model:
 *                   type: string
 *                 cacheControl:
 *                   oneOf:
 *                     - type: boolean
 *                     - type: number
 *             example:
 *               kind: "chat"
 *               systemPrompt: "Sistema de assistência jurídica"
 *               prompt: "Responda de forma clara"
 *               model: "gpt-4"
 *       400:
 *         description: Requisição inválida
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Prompt não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
export async function GET(_req: Request, context: any): Promise<Response> { // afrouxa tipagem para compatibilidade com tipos internos
    // Suporta caso context.params seja direto ou uma Promise
    const params = await Promise.resolve(context?.params)
    const name = params?.name
    if (!name) {
        return new Response(JSON.stringify({ error: 'Missing prompt name' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        })
    }
    try {
        const internalPrompt: PromptDefinitionType = getInternalPrompt(name)
        return new Response(JSON.stringify(internalPrompt, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Prompt not found', detail: (err as Error).message }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}