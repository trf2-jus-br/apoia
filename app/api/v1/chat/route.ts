import { generateAndStreamContent } from '@/lib/ai/generate'
import { getModel } from '@/lib/ai/model-server'
import { getTools } from '@/lib/ai/tools'
import { UserDao } from '@/lib/db/dao'
import { getPromptDefinitionById } from '@/lib/ai/prompt-store'
import { assertApiUser } from '@/lib/user'
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, StreamTextResult, ToolSet, UIMessage } from 'ai'
import { withErrorHandler } from '@/lib/utils/api-error'
import { calcSha256 } from '@/lib/utils/hash'

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
    const { messages, execution_id, aggregator_prompt_id, dossierCode } = await req.json()
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
    const promptId = searchParams.get('promptId') ? parseInt(searchParams.get('promptId')!, 10) : null

    let chatKind = 'chat'
    if (promptId) {
        try {
            const def = await getPromptDefinitionById(promptId)
            chatKind = def.kind
        } catch {
            // prompt not found, fall back to 'chat'
        }
    }

    const modelMessages = await convertToModelMessages(messages)

    // Telemetria: tamanho das messages recebidas do cliente (histórico de chat).
    // {
    //     let totalChars = 0
    //     let maiorMsgChars = 0
    //     for (const m of modelMessages) {
    //         const c = (m as any).content
    //         const len = typeof c === 'string'
    //             ? c.length
    //             : Array.isArray(c)
    //                 ? c.reduce((a: number, p: any) => a + (typeof p?.text === 'string' ? p.text.length : 0), 0)
    //                 : 0
    //         totalChars += len
    //         if (len > maiorMsgChars) maiorMsgChars = len
    //     }
    //     logPiecesEvent('chat:request', {
    //         n_messages: modelMessages.length,
    //         total_chars: totalChars,
    //         maior_msg_chars: maiorMsgChars,
    //     })
    // }

    const sha256 = calcSha256(modelMessages)

    const ret = await generateAndStreamContent(
        model,
        undefined, // structuredOutputs
        true, // cacheControl
        chatKind, // kind
        modelRef,
        modelMessages,
        sha256, // sha256
        { dossierCode: dossierCode || undefined, execution_id: execution_id || undefined, aggregator_prompt_id: aggregator_prompt_id ?? null }, // additionalInformation
        {}, // results
        null, // attempt
        apiKeyFromEnv,
        //withTools ? await getTools(pUser) : undefined
        await getTools(pUser),
        promptId, // prompt_id
    )

    if (ret.cached) {
        const stream = createUIMessageStream<UIMessage>({
            execute: async ({ writer }) => {
                writer.write({ type: 'start', messageId: crypto.randomUUID() });
                writer.write({ type: 'start-step' });
                writer.write({ type: 'text-start', id: '1' });
                writer.write({ type: 'text-delta', delta: ret.cached, id: '1' });
                writer.write({ type: 'text-end', id: '1' });
                writer.write({ type: 'finish-step' });
                writer.write({
                    type: 'finish',
                    messageMetadata: {
                        model: ret.model,
                        usage: ret.usage,
                        messages: modelMessages
                    },
                });
            }
        })
        return createUIMessageStreamResponse({ stream });
        // return new Response(ret.cached, { status: 200 })
    }

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