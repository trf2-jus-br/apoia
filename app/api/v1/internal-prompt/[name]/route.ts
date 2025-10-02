import { getInternalPrompt } from '@/lib/ai/prompt'
import { PromptDefinitionType } from '@/lib/ai/prompt-types'
import { BadRequestError, NotFoundError, withErrorHandler } from '@/lib/utils/api-error'

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
async function GET_HANDLER(_req: Request, context: any): Promise<Response> { // afrouxa tipagem para compatibilidade com tipos internos
    const params = await Promise.resolve(context?.params)
    const name = params?.name
    if (!name) throw new BadRequestError('Missing prompt name')
    try {
        const internalPrompt: PromptDefinitionType = getInternalPrompt(name)
        return new Response(JSON.stringify(internalPrompt, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        throw new NotFoundError('Prompt não encontrado')
    }
}

export const GET = withErrorHandler(GET_HANDLER as any)