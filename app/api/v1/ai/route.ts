import { streamContent } from '../../../../lib/ai/generate'
import { PromptDefinitionType, PromptExecutionResultsType, PromptOptionsType } from '@/lib/ai/prompt-types'
import { promptDefinitionFromDefinitionAndOptions } from '@/lib/ai/prompt'
import { getPromptDefinition as getPromptDefinitionFromStore } from '@/lib/ai/prompt-store'
import { PromptDao, UserDao } from '@/lib/db/dao'
import { IAPrompt } from '@/lib/db/mysql-types'
import { normalizeModelProfile } from '@/lib/ai/model-types'
import { assertApiUser } from '@/lib/user'
import { preprocessTemplate } from '@/lib/ai/template'
import { createUIMessageStream, createUIMessageStreamResponse, StreamTextResult, ToolSet, UIMessage } from 'ai'
import { ApiError, Trace, UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'
import { getTools } from '@/lib/ai-tools/tools'

export const maxDuration = 60

/**
 * JSON.stringify protegido contra referências circulares e profundidade excessiva.
 * Substitui referências circulares por "[Circular]" e limita profundidade.
 */
function safeStringify(obj: any, space?: number): string {
    const MAX_DEPTH = 10
    try {
        const seen = new WeakSet()
        let depth = 0
        return JSON.stringify(obj, function (key, value) {
            // Controla profundidade
            if (typeof value === 'object' && value !== null) {
                if (depth >= MAX_DEPTH) return '[MaxDepth]'
                if (seen.has(value)) return '[Circular]'
                seen.add(value)
                depth++
            }
            if (typeof value === 'function') return '[Function]'
            if (value instanceof Promise) return '[Promise]'
            if (typeof value === 'object' && value !== null && typeof value.getReader === 'function') return '[Stream]'
            return value
        }, space)
    } catch (e: any) {
        return `[safeStringify failed: ${e.message}]`
    }
}

async function resolveApiPrompt(kind: string, promptSlug?: string, promptId?: number): Promise<PromptDefinitionType> {
    let prompt: IAPrompt | undefined = undefined
    if (promptId) {
        prompt = await PromptDao.retrievePromptById(promptId)
        if (!prompt)
            throw new Error(`Prompt not found: ${promptId}`)
        if (!prompt.category)
            prompt.category = `prompt-${prompt.id}`
        if (prompt.content.template && (!prompt.content.prompt || !prompt.content.system_prompt)) {
            const promptTemplate = await getPromptDefinitionFromStore('template')
            if (!prompt.content.prompt) prompt.content.prompt = promptTemplate.prompt
            if (!prompt.content.system_prompt) prompt.content.system_prompt = promptTemplate.systemPrompt
        }
    } else if (kind && promptSlug) {
        const prompts = await PromptDao.retrievePromptsByKindAndSlug(kind, promptSlug)
        if (prompts.length === 0) {
            throw new Error(`Prompt not found: ${kind}/${promptSlug}`)
        }
        let found = prompts.find(p => p.is_official)
        if (!found)
            found = prompts[0]
        if (found)
            prompt = await PromptDao.retrievePromptById(found.id)
    }

    const definition: PromptDefinitionType =
        prompt ? {
            kind: prompt.slug || prompt.category || `prompt-${prompt.id}`,
            name: prompt.name,
            systemPrompt: prompt.content.system_prompt || undefined,
            prompt: prompt.content.prompt || '',
            jsonSchema: prompt.content.json_schema || undefined,
            format: prompt.content.format || undefined,
            template: prompt.content.template || undefined,
            dbId: prompt.id,
            metadata: {
                target: prompt.content.target || undefined,
                profile: normalizeModelProfile(prompt.content.profile),
            }
        } : await getPromptDefinitionFromStore(kind)

    return definition
}

/**
 * @swagger
 * /api/v1/ai:
 *   post:
 *     summary: Executa um prompt de IA e retorna a resposta (stream ou texto)
 *     description: Gera uma resposta a partir de diversos parâmetros de configuração de prompt e dados obtidos de um processo ou texto arbitrário.
 *     tags:
 *       - ai
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kind, data]
 *             properties:
 *               kind:
 *                 type: string
 *                 description: "Identificador do prompt interno ou personalizado (ex: chat, resumo, prompt-123)."
 *               promptSlug:
 *                 type: string
 *                 description: Slug de um prompt oficial para o tipo indicado em kind.
 *               promptId:
 *                 type: integer
 *                 description: ID numérico de um prompt salvo.
 *               data:
 *                 type: object
 *                 description: "Dados de entrada (ex: numeroDoProcesso, textos, etc) dependentes do prompt."
 *               overrideSystemPrompt:
 *                 type: string
 *                 description: Sobrescreve o system prompt.
 *               overridePrompt:
 *                 type: string
 *                 description: Sobrescreve o prompt principal.
 *               overrideJsonSchema:
 *                 type: string
 *                 description: Força um JSON Schema para validação da saída.
 *               overrideFormat:
 *                 type: string
 *                 description: "Formato alternativo (ex: MARKDOWN, HTML, JSON_LINES)."
 *               overrideTemplate:
 *                 type: string
 *                 description: Template de composição (caso use prompts internos com placeholders).
 *               cacheControl:
 *                 type: boolean
 *                 description: Ativa/desativa mecanismo de cache da geração.
 *               modelSlug:
 *                 type: string
 *                 description: Modelo de IA a ser usado (sobrescreve configuração padrão).
 *               extra:
 *                 type: string
 *                 description: Texto adicional concatenado ao prompt final.
 *               dossierCode:
 *                 type: string
 *                 description: Código do dossiê / processo usado para auditoria.
 *               documentId:
 *                 type: string
 *                 description: Identificador de documento associado (quando aplicável).
 *     responses:
 *       200:
 *         description: Resposta do assistente (texto plano ou JSON se jsonSchema for utilizado).
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: string
 *               description: Conteúdo textual serializado ou objeto conforme schema solicitado.
 *       400:
 *         description: Requisição inválida (parâmetros incorretos / prompt inexistente).
 *       401:
 *         description: Não autorizado.
 *       405:
 *         description: Erro durante a execução do prompt ou comunicação com o provedor.
 */
async function POST_HANDLER(request: Request, _props: any, trace: Trace) {
    trace.step('start')
    const { searchParams } = new URL(request.url)
    const messagesOnly = searchParams.get('messagesOnly') === 'true'

    trace.step('assertApiUser')
    const pUser = assertApiUser()
    const user = await pUser

    trace.step('prepareUserFields')
    // Update user details
    const userFields = user.corporativo?.length ? {
        name: user.corporativo?.[0]?.nom_usuario || null,
        cpf: user.corporativo?.[0]?.num_cpf || null,
        email: user.corporativo?.[0]?.dsc_email || null,
        unit_id: user.corporativo?.[0]?.seq_orgao || null,
        unit_name: user.corporativo?.[0]?.dsc_orgao || null,
        court_id: user.corporativo?.[0]?.seq_tribunal_pai || null,
        court_name: user.corporativo?.[0]?.dsc_tribunal_pai || null,
        state_abbreviation: user.corporativo?.[0]?.sig_uf || null,
    } : undefined

    trace.step('assertIAUserId')
    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name, userFields)

    trace.step('parseBody')
    const body = await request.json()
    const kind: string = body.kind
    const promptSlug: string | undefined = body.promptSlug
    let promptId: number | undefined = body.promptId || body.dbId
    if (!promptId && kind.startsWith('prompt-')) {
        const parts = kind.split('-')
        if (parts.length === 2) {
            promptId = parseInt(parts[1])
        }
    }

    // Get context to be submitted to the streamContent function and be used in the logs
    const dossierCode = body.dossierCode
    const documentId = body.documentId
    const execution_id: string | undefined = body.execution_id || undefined
    const aggregator_prompt_id: number | null = body.aggregator_prompt_id ?? null

    trace.step(`resolveApiPrompt:${kind}`)
    const definition = await resolveApiPrompt(kind, promptSlug, promptId)
    const data: any = body.data
    // Telemetria: tamanho do input recebido do cliente (textos + binários).
    // {
    //     const textos = Array.isArray(data?.textos) ? data.textos : []
    //     let totalTextoChars = 0
    //     let totalBinarioBytes = 0
    //     let maiorPecaChars = 0
    //     for (const t of textos) {
    //         const txt = typeof t?.texto === 'string' ? t.texto : ''
    //         if (txt.startsWith('data:')) {
    //             totalBinarioBytes += txt.length
    //         } else {
    //             totalTextoChars += txt.length
    //             if (txt.length > maiorPecaChars) maiorPecaChars = txt.length
    //         }
    //     }
    //     logPiecesEvent('ai:request', {
    //         kind,
    //         n_pecas: textos.length,
    //         total_texto_chars: totalTextoChars,
    //         maior_peca_chars: maiorPecaChars,
    //         total_binario_bytes: totalBinarioBytes,
    //     })
    // }
    const options: PromptOptionsType = {
        overrideSystemPrompt: body.overrideSystemPrompt,
        overridePrompt: body.overridePrompt,
        overrideJsonSchema: body.overrideJsonSchema,
        overrideFormat: body.overrideFormat,
        overrideTemplate: body.overrideTemplate,
        cacheControl: body.cacheControl,
    }

    trace.step('buildDefinitionWithOptions')
    const definitionWithOptions = promptDefinitionFromDefinitionAndOptions(definition, options)

    if (definitionWithOptions.template) {
        trace.step('preprocessTemplate')
        definitionWithOptions.template = preprocessTemplate(definitionWithOptions.template)
    }

    if (body.modelSlug)
        definitionWithOptions.model = body.modelSlug

    if (body.extra)
        definitionWithOptions.prompt += '\n\n' + body.extra

    trace.step('getTools')
    const tools = await getTools(pUser)

    trace.step('streamContent')
    const executionResults: PromptExecutionResultsType = { messagesOnly }
    const ret = await streamContent(definitionWithOptions, data, executionResults, { dossierCode, execution_id, aggregator_prompt_id }, tools)

    trace.step(`streamContent:done:cached=${!!ret.cached}:textStream=${!!ret.textStream}:objectStream=${!!ret.objectStream}:messages=${!!ret.messages}`)

    if (ret.messages && messagesOnly) {
        trace.step('return:messagesOnly')
        return new Response(ret.messages, { status: 200 })
    }

    if (ret.cached) {
        trace.step('return:cached')
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
                        messages: executionResults.messages,
                        generationId: executionResults.generationId,
                    },
                });
            }
        })
        return createUIMessageStreamResponse({ stream });
        // return new Response(ret.cached, { status: 200 })
    }

    if (ret.textStream && searchParams.get('uiMessageStream') === 'true') {
        trace.step('return:uiMessageStream')
        const uiMessageStream = ((await ret.textStream) as StreamTextResult<ToolSet, any>).toUIMessageStream({ sendFinish: false })
        const stream = createUIMessageStream<UIMessage>({
            execute: async ({ writer }) => {
                for await (const part of uiMessageStream) {
                    writer.write(part)
                }
                writer.write({
                    type: 'finish',
                    messageMetadata: { model: ret.model, usage: ret.usage, messages: executionResults.messages, generationId: executionResults.generationId },
                });
            }
        })
        return createUIMessageStreamResponse({ stream });
    }

    if (ret.textStream || ret.objectStream) {
        trace.step('return:rawStream')
        const result = ret.textStream ? await ret.textStream : ret.objectStream ? await ret.objectStream : null
        const reader: ReadableStreamDefaultReader = (result as any).fullStream.getReader()
        const { value, done } = await reader.read()
        if (value?.type === 'error') {
            const error = value.error;
            throw new Error(`Erro na comunicação com o provedor de inteligência artificial: ${error}`)
        }
        const feederStream = new ReadableStream({
            start(controller) {
                if (value?.type === 'text')
                    controller.enqueue(value)
                function pump() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            controller.close()
                            return
                        }
                        switch (value.type) {
                            case 'text-delta': {
                                controller.enqueue(value.text || value.textDelta)
                                break;
                            }
                            case 'error': {
                                const error = value.error;
                                controller.enqueue(`Erro na comunicação com o provedor de inteligência artificial: ${error}`)
                            }
                        }
                        pump()
                    })
                }
                pump()
            },
        })

        return new Response(feederStream, {
            status: 200,
            headers: {
                'Content-Type': definitionWithOptions.jsonSchema ? 'application/json' : 'text/plain; charset=utf-8',
            },
        })
    }

    trace.step('error:build ret JSON')
    const retJson = safeStringify(ret)

    trace.step('error:invalidResponse')
    throw new ApiError(`Resposta inválida do provedor de IA (${retJson})`, 500)
}

export const POST = withErrorHandler(POST_HANDLER as any)
