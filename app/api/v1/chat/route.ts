import { generateAndStreamContent } from '@/lib/ai/generate'
import { getModel } from '@/lib/ai/model-server'
import { getTools } from '@/lib/ai/tools'
import { Dao } from '@/lib/db/mysql'
import { getCurrentUser, assertApiUser } from '@/lib/user'
import { convertToModelMessages, StreamTextResult, ToolSet } from 'ai'
import * as Sentry from '@sentry/nextjs'
import devLog from '@/lib/utils/log'
import { UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'

// Allow streaming responses up to 30 seconds
export const maxDuration = 60

/**
 * @swagger
 * 
 * /api/v1/chat:
 *   post:
 *     description: Executa uma operação de chat com o modelo de linguagem padrão
 *     tags:
 *       - ai
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: body
 *         name: messages
 *         required: true
 *         description: Mensagens do chat
 *     responses:
 *       200:
 *         description: Resposta do assistente
 */
async function POST_HANDLER(req: Request) {
    const pUser = assertApiUser()
    const user = await pUser
    const user_id = await Dao.assertIAUserId(user.preferredUsername || user.name)
    const { messages } = await req.json()
    const { model, modelRef, apiKeyFromEnv } = await getModel()

    // const anonymize = req.headers.get('cookie')?.includes('anonymize=true')
    // if (anonymize) {
    //     messages.forEach((message: any) => {
    //         if (message.role === 'user' && message.content) {
    //             message.content = anonymizeText(message.content).text
    //         }
    //     })
    // }

    const { searchParams } = new URL(req.url)
    const withTools = searchParams.get('withTools') === 'true'

    const result = await generateAndStreamContent(
        model,
        undefined, // structuredOutputs
        false, // cacheControl
        'chat', // kind
        modelRef,
        convertToModelMessages(messages),
        '', // sha256
        {}, // additionalInformation
        {}, // results
        null, // attempt
        apiKeyFromEnv,
        withTools ? await getTools(pUser) : undefined
    )

    if (typeof result === 'string') {
        return new Response(result, { status: 200 })
    }

    return ((await result.textStream) as StreamTextResult<ToolSet, any>).toUIMessageStreamResponse();
}

export const POST = withErrorHandler(POST_HANDLER as any)