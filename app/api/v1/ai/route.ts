import { streamContent } from '../../../../lib/ai/generate'
import { NextResponse } from 'next/server'
import Fetcher from '../../../../lib/utils/fetcher'
import { PromptDefinitionType, PromptExecutionResultsType, PromptOptionsType } from '@/lib/ai/prompt-types'
import { getInternalPrompt, promptDefinitionFromDefinitionAndOptions } from '@/lib/ai/prompt'
import { Dao } from '@/lib/db/mysql'
import { IAPrompt } from '@/lib/db/mysql-types'
import { getCurrentUser, assertApiUser } from '@/lib/user'
import { preprocessTemplate } from '@/lib/ai/template'
import { StreamTextResult, ToolSet } from 'ai'
import * as Sentry from '@sentry/nextjs'
import { devLog } from '@/lib/utils/log'
import { ApiError, UnauthorizedError, withErrorHandler } from '@/lib/utils/api-error'

export const maxDuration = 60

async function getPromptDefinition(kind: string, promptSlug?: string, promptId?: number): Promise<PromptDefinitionType> {
    let prompt: IAPrompt | undefined = undefined
    if (promptId) {
        prompt = await Dao.retrievePromptById(promptId)
        if (!prompt)
            throw new Error(`Prompt not found: ${promptId}`)
        if (!prompt.kind)
            prompt.kind = `prompt-${prompt.id}`
        if (prompt.content.template && (!prompt.content.prompt || !prompt.content.system_prompt)) {
            const promptTemplate = getInternalPrompt('template')
            if (!prompt.content.prompt) prompt.content.prompt = promptTemplate.prompt
            if (!prompt.content.system_prompt) prompt.content.system_prompt = promptTemplate.systemPrompt
        }
    } else if (kind && promptSlug) {
        const prompts = await Dao.retrievePromptsByKindAndSlug(kind, promptSlug)
        if (prompts.length === 0)
            throw new Error(`Prompt not found: ${kind}/${promptSlug}`)
        let found = prompts.find(p => p.is_official)
        if (!found)
            found = prompts[0]
        if (found)
            prompt = await Dao.retrievePromptById(found.id)
    }

    const definition: PromptDefinitionType =
        prompt ? {
            kind: prompt.kind,
            systemPrompt: prompt.content.system_prompt || undefined,
            prompt: prompt.content.prompt || '',
            jsonSchema: prompt.content.json_schema || undefined,
            format: prompt.content.format || undefined,
            template: prompt.content.template || undefined,
        } : getInternalPrompt(kind)

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
async function POST_HANDLER(request: Request) {
        const { searchParams } = new URL(request.url)
        const messagesOnly = searchParams.get('messagesOnly') === 'true'

    const user = await assertApiUser()

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
        const user_id = await Dao.assertIAUserId(user.preferredUsername || user.name, userFields)

        const body = await request.json()
        const kind: string = body.kind
        const promptSlug: string | undefined = body.promptSlug
        let promptId: number | undefined = body.promptId
        if (!promptId && kind.startsWith('prompt-')) {
            const parts = kind.split('-')
            if (parts.length === 2) {
                promptId = parseInt(parts[1])
            }
        }

        // Get context to be submitted to the streamContent function and be used in the logs
        const dossierCode = body.dossierCode
        const documentId = body.documentId

        const definition = await getPromptDefinition(kind, promptSlug, promptId)
        const data: any = body.data
        const options: PromptOptionsType = {
            overrideSystemPrompt: body.overrideSystemPrompt,
            overridePrompt: body.overridePrompt,
            overrideJsonSchema: body.overrideJsonSchema,
            overrideFormat: body.overrideFormat,
            overrideTemplate: body.overrideTemplate,
            cacheControl: body.cacheControl,
        }

        const definitionWithOptions = promptDefinitionFromDefinitionAndOptions(definition, options)

        if (definitionWithOptions.template) {
            definitionWithOptions.template = preprocessTemplate(definitionWithOptions.template)
        }

        if (body.modelSlug)
            definitionWithOptions.model = body.modelSlug

        if (body.extra)
            definitionWithOptions.prompt += '\n\n' + body.extra

        const executionResults: PromptExecutionResultsType = { messagesOnly }
        const ret = await streamContent(definitionWithOptions, data, executionResults, { dossierCode })

        if (ret.messages && messagesOnly) {
            return new Response(ret.messages, { status: 200 })
        }

        if (ret.cached) {
            return new Response(ret.cached, { status: 200 })
        }

        if (ret.textStream && searchParams.get('uiMessageStream') === 'true') {
            return ((await ret.textStream) as StreamTextResult<ToolSet, any>).toUIMessageStreamResponse();
        }

        if (ret.textStream || ret.objectStream) {
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

        throw new ApiError('Invalid response', 500)
}

export const POST = withErrorHandler(POST_HANDLER as any)
