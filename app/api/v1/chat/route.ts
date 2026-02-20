import { generateAndStreamContent } from '@/lib/ai/generate'
import { getModel } from '@/lib/ai/model-server'
import { getTools } from '@/lib/ai/tools'
import { UserDao } from '@/lib/db/dao'
import { assertApiUser } from '@/lib/user'
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, StreamTextResult, ToolSet, UIMessage } from 'ai'
import { withErrorHandler } from '@/lib/utils/api-error'

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
    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)
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

    const ret = await generateAndStreamContent(
        model,
        undefined, // structuredOutputs
        true, // cacheControl
        'chat', // kind
        modelRef,
        await convertToModelMessages(messages),
        '', // sha256
        {}, // additionalInformation
        {}, // results
        null, // attempt
        apiKeyFromEnv,
        //withTools ? await getTools(pUser) : undefined
        await getTools(pUser)
    )

    if (typeof ret === 'string') {
        return new Response(ret, { status: 200 })
    }

    const uiMessageStream = ((await ret.textStream) as StreamTextResult<ToolSet, any>).toUIMessageStream({ sendFinish: false })
    const stream = createUIMessageStream<UIMessage>({
        execute: async ({ writer }) => {
            for await (const part of uiMessageStream) {
                writer.write(part)
            }
            writer.write({
                type: 'finish',
                messageMetadata: { model: ret.model, usage: ret.usage },
            });
        }
    })
    return createUIMessageStreamResponse({ stream });
}

export const POST = withErrorHandler(POST_HANDLER as any)