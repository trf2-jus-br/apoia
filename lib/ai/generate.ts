'use server'

import { streamText, StreamTextResult, LanguageModel, streamObject, StreamObjectResult, DeepPartial, ModelMessage, generateText, ToolSet, stepCountIs, Output } from 'ai'
import { IAGenerated, IAGeneration } from '../db/mysql-types'
import { GenerationDao, SystemDao, DossierDao, UserDao } from '../db/dao'
import { assertCourtId, assertCurrentUser, assertSystemCode, UserType } from '../user'
import { PromptAdditionalInformationType, PromptDataType, PromptDefinitionType, PromptExecutionResultsType, PromptOptionsType, TextoType, UsageType } from '@/lib/ai/prompt-types'
import { promptExecuteBuilder, waitForTexts } from './prompt'
import { calcSha256 } from '../utils/hash'
import { envString } from '../utils/env'
import { anonymizeText } from '../anonym/anonym'
import { getModel } from './model-server'
import { modelCalcUsage, Model, FileTypeEnum, ModelUsageResult } from './model-types'
import { cookies } from 'next/headers';
import { clipPieces } from './clip-pieces'
import { pdfToText } from '../pdf/pdf'
import { assertAnonimizacaoAutomatica } from '../proc/sigilo'
import { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import devLog, { isDev } from '../utils/log'
import * as Sentry from '@sentry/nextjs'
import { getLibraryDocumentsForPrompt } from './library'

export async function checkModelSupportsAudioVideo(modelName: string): Promise<boolean> {
    const details = Object.values(Model).find(m => m.name === modelName)
    const audioVideoTypes = [
        FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV,
        FileTypeEnum.WMA, FileTypeEnum.WMV, FileTypeEnum.AIFF,
        FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC
    ]
    return audioVideoTypes.some(type => details?.supportedFileTypes?.includes(type))
}

export async function checkModelSupportsPdf(modelName: string): Promise<boolean> {
    const details = Object.values(Model).find(m => m.name === modelName)
    return !!details?.supportedFileTypes?.includes(FileTypeEnum.PDF)
}

export async function retrieveFromCache(sha256: string, model: string, prompt: string, attempt: number | null): Promise<IAGenerated | undefined> {
    const cached = await GenerationDao.retrieveIAGeneration({ sha256, model, prompt, attempt })
    if (cached?.generation) return cached
    return undefined
}

async function saveToCache(data: IAGeneration): Promise<number | undefined> {
    const inserted = await GenerationDao.insertIAGeneration(data)
    if (!inserted) return undefined
    return inserted.id
}

async function saveLog(user: UserType, additionalInformation: PromptAdditionalInformationType, model: string, usage, sha256: string, kind: string, text: string, attempt: number, messages: ModelMessage[], calculedUsage: ModelUsageResult, prompt_id?: number | null): Promise<number> {
    const system_id = await SystemDao.assertSystemId(await assertSystemCode(user))
    const dossier_id = additionalInformation?.dossierCode ? (await DossierDao.assertIADossierId(additionalInformation.dossierCode, system_id, undefined, undefined)) : null
    const generationId = await saveToCache({
        sha256, model, prompt: kind, generation: text, attempt: attempt || null,
        prompt_payload: JSON.stringify(messages), dossier_id, document_id: null,
        cached_input_tokens: usage.cachedInputTokens || 0, input_tokens: usage.inputTokens || 0, output_tokens: usage.outputTokens || 0, reasoning_tokens: usage.reasoningTokens || 0,
        approximate_cost: calculedUsage.approximate_cost,
        prompt_id: prompt_id ?? null
    })
    return generationId
}

// write response to a file for debugging
function writeResponseToFile(kind: string, messages: ModelMessage[], text: string) {
    const path: string = envString('SAVE_PROMPT_RESULTS_PATH') || ''
    if (envString('NODE_ENV') === 'development' && path) {
        const fs = require('fs')
        const currentDate = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0]
        let s = ''
        for (const m of messages) s += `${m.role === 'system' ? '---\\# SYSTEM PROMPT' : m.role === 'user' ? '---\\# PROMPT' : `---\\# ROLE: ${m.role}`}\n\n${typeof m.content === 'string' ? m.content : m.content && typeof m.content === 'object' ? JSON.stringify(m.content, null, 2) : String(m.content)}\n\n`
        s += `\n\n---\n# RESPONSE\n\n${text}`
        fs.writeFileSync(`${path}/${currentDate}-${kind}.txt`, s)
    }
}

export async function generateContent(definition: PromptDefinitionType, data: PromptDataType, tools?: Record<string, any>): Promise<IAGenerated> {
    const results: PromptExecutionResultsType = {}
    const ret = await streamContent(definition, data, results, undefined, tools)
    const stream = ret.textStream ? await ret.textStream : ret.objectStream ? await ret.objectStream : ret.cached ? ret.cached : undefined

    let text: string
    if (typeof stream === 'string') {
        text = stream
    } else {
        try {
            text = ''
            const dev = isDev()
            for await (const textPart of stream.textStream) {
                if (dev) process.stdout.write(textPart)
                text += textPart
            }
        } catch (error) {
            console.error('Error while streaming text:', error)
            throw new Error(`Error while streaming text: ${error.message}`)
        }
    }

    return {
        id: results.generationId as number,
        sha256: results.sha256 as string,
        model: results.model as string,
        prompt: definition.kind,
        generation: text,
        attempt: definition?.cacheControl !== true && definition?.cacheControl || null
    }
}

export async function writeUsage(usage, model: string, user_id: number | undefined, court_id: number | undefined, calculedUsage: ModelUsageResult) {
    if (user_id && court_id)
        await UserDao.addToIAUserDailyUsage(user_id, court_id, calculedUsage.input_tokens, calculedUsage.output_tokens, calculedUsage.approximate_cost)
}

export type PromptReturnType = {
    model: string
    messages?: string
    cached?: string
    textStream?: Promise<StreamTextResult<ToolSet, any>>
    objectStream?: Promise<StreamObjectResult<DeepPartial<any>, any, never>>
    usage?: UsageType
}

export async function streamContent(definition: PromptDefinitionType, data: PromptDataType, results?: PromptExecutionResultsType, additionalInformation?: PromptAdditionalInformationType, tools?: Record<string, any>):
    Promise<PromptReturnType> {
    // const user = await getCurrentUser()
    // if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
    devLog('will build prompt', definition.kind)
    await waitForTexts(data)

    // Anonymize text if the cookie is set
    const cookiesList = await (cookies());
    const anonymize = cookiesList.get('anonymize')?.value === 'true'
    data.textos = data.textos.map((texto: TextoType) => {
        if (texto.texto?.startsWith('data:') && texto.texto.includes(';base64,')) 
            return texto
        if (anonymize || assertAnonimizacaoAutomatica(texto.sigilo)) {
            devLog(`Anonymizing piece ${texto.id} (${texto.descr}) with confidentiality level ${texto.sigilo}`)
            return { ...texto, texto: anonymizeText(texto.texto).text }
        } else {
            return texto
        }
    })

    // Get the model so that we can clip the pieces if necessary
    const { model: modelPreSelected } = await getModel({ structuredOutputs: false, overrideModel: definition.model })
    data.textos = clipPieces(modelPreSelected, data.textos)

    const libraryPrompt = await getLibraryDocumentsForPrompt(data.documentosDaBiblioteca)
    const exec = await promptExecuteBuilder(definition, data, libraryPrompt)
    const messages = exec.message
    const structuredOutputs = exec.params?.structuredOutputs

    const { model, modelRef, apiKeyFromEnv } = await getModel({ structuredOutputs: !!structuredOutputs, overrideModel: definition.model })

    if (results) results.model = model
    const sha256 = calcSha256(messages)
    if (results) results.sha256 = sha256
    const attempt = definition?.cacheControl !== true && definition?.cacheControl || null

    if (results?.messagesOnly) {
        return { model, messages: JSON.stringify(messages) }
    }

    // try to retrieve cached generations
    if (definition?.cacheControl !== false) {
        const cached = await retrieveFromCache(sha256, model, definition.kind, attempt)
        if (cached) {
            // Ensure downstream code receives the persisted generation id
            if (results) {
                results.generationId = cached.id
                results.model = cached.model || model
                const { processedMessagesLog } = await processMessages(model, messages)
                results.messages = processedMessagesLog
            }
            return { model, cached: cached.generation }
        }
    }

    // writeResponseToFile(definition, messages, "antes de executar")
    // if (1 == 1) throw new Error('Interrupted')

    return generateAndStreamContent(model, structuredOutputs, definition?.cacheControl, definition?.kind, modelRef, messages, sha256, additionalInformation, results, attempt, apiKeyFromEnv, tools, definition?.dbId)
}

export async function generateAndStreamContent(model: string, structuredOutputs: any, cacheControl: number | boolean, kind: string, modelRef: LanguageModel, messages: ModelMessage[], sha256: string, additionalInformation: PromptAdditionalInformationType, results?: PromptExecutionResultsType, attempt?: number | null, apiKeyFromEnv?: boolean, tools?: Record<string, any>, prompt_id?: number | null):
    Promise<PromptReturnType> {
    const pUser = assertCurrentUser()
    const user = await pUser
    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)
    const court_id = assertCourtId(user)
    const returnData: PromptReturnType = { model }

    devLog('streaming text', kind) //, messages, modelRef)
    if (apiKeyFromEnv) {
        await UserDao.assertIAUserDailyUsageId(user_id, court_id)
    }
    // writeResponseToFile(kind, processedMessagesLog, 'antes de executar')
    // if (model.startsWith('aws-')) {
    //     const { text, usage } = await generateText({
    //         model: modelRef as LanguageModel,
    //         messages,
    //         maxRetries: 0,
    //         // temperature: 1.5,
    //     })
    //     writeUsage(usage, model, results?.user_id, results?.court_id)
    //     if (cacheControl !== false) {
    //         const generationId = await saveToCache(sha256, model, kind, text, attempt || null)
    //         if (results) results.generationId = generationId
    //     }
    //     writeResponseToFile(kind, messages, text)
    //     return text
    // } else {
    const { processedMessagesModel, processedMessagesLog } = await processMessages(model, messages)
    if (results) results.messages = processedMessagesLog
    const pResult = streamText({
        model: modelRef as LanguageModel,
        messages: processedMessagesModel,
        maxRetries: 0,
        onStepFinish: ({ text, usage }) => {
            // if (isDev()) process.stdout.write(text)
        },
        onError: (error) => {
            Sentry.captureException(error, { extra: { context: 'streamingText', model, kind, user_id, court_id } })
            console.error('Error during streaming:', error, (error as any)?.cause)
        },
        onFinish: async ({ text, usage, providerMetadata }) => {
            const modelUsage = modelCalcUsage(model, usage)
            returnData.usage = { ...usage, dollarValue: modelUsage.approximate_cost }
            if (apiKeyFromEnv)
                writeUsage(usage, model, user_id, court_id, modelUsage)
            if (cacheControl !== false) {
                const generationId = await saveLog(user, additionalInformation, model, usage, sha256, kind, text, attempt, processedMessagesLog, modelUsage, prompt_id)
                if (results) results.generationId = generationId
            }
            writeResponseToFile(kind, processedMessagesLog, text)
            if (providerMetadata) {
                devLog('Provider metadata:', providerMetadata)
            }
        },
        tools: structuredOutputs ? undefined : tools, // Gemini models don't support tools when structured outputs are used
        stopWhen: stepCountIs(10),
        providerOptions: {
            google: {
                thinkingConfig: {
                    // thinkingBudget: 2024, // Set a budget (0 to disable, up to 24576 for Flash)
                    includeThoughts: true, // Crucial to include the thinking process in the response
                },
            } satisfies GoogleGenerativeAIProviderOptions,
            openai: {
                reasoningSummary: 'auto',
            } satisfies OpenAIResponsesProviderOptions,
        },
        output: structuredOutputs
            ? Output.object({ schema: structuredOutputs.schema })
            : Output.text(),
        //    if (!\structuredOutputs) { // text streaming branch
        //            schemaName: `schema${kind}`,
        //            schemaDescription: `A schema for the prompt ${kind}`,
        //            schema: structuredOutputs.schema,
    })
    returnData.textStream = pResult as any
    return returnData
    // }
}

async function processMessages(model: string, messages: ModelMessage[]): Promise<{ processedMessagesModel: ModelMessage[], processedMessagesLog: ModelMessage[] }> {
    // --- PDF processing & logging sanitization ---
    const modelSupportsPdf = () => {
        const details = Object.values(Model).find(m => m.name === model)
        return !!details?.supportedFileTypes?.includes(FileTypeEnum.PDF)
    }

    const modelSupportsAudioVideo = () => {
        const details = Object.values(Model).find(m => m.name === model)
        const audioVideoTypes = [
            FileTypeEnum.MP3, FileTypeEnum.MP4, FileTypeEnum.WAV,
            FileTypeEnum.WMA, FileTypeEnum.WMV, FileTypeEnum.AIFF,
            FileTypeEnum.AAC, FileTypeEnum.OGG, FileTypeEnum.FLAC
        ]
        return audioVideoTypes.some(type => details?.supportedFileTypes?.includes(type))
    }
    const processedMessagesModel: ModelMessage[] = []
    const processedMessagesLog: ModelMessage[] = []
    for (const m of messages) {
        if (!Array.isArray((m as any).content)) { processedMessagesModel.push(m); processedMessagesLog.push(m); continue }
        const newPartsModel: any[] = []
        const newPartsLog: any[] = []
        for (const part of (m as any).content) {
            if (part?.type === 'file' && part.mediaType === 'application/pdf') {
                if (!modelSupportsPdf()) {
                    try {
                        if (part.url?.startsWith('data:')) {
                            const base64 = part.url.split(',')[1]
                            const binary = Buffer.from(base64, 'base64')
                            if (binary.length < 10 * 1024 * 1024) {
                                const extracted = await pdfToText(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength), {})
                                const textPart = { type: 'text', text: `CONTEUDO_PDF_EXTRAIDO(${part.filename}):\n${extracted.slice(0, 150000)}${extracted.length > 150000 ? '\n...[truncado]' : ''}` }
                                newPartsModel.push(textPart)
                                newPartsLog.push(textPart)
                                continue
                            } else {
                                const tooBig = { type: 'text', text: `PDF(${part.filename}) muito grande para extração local (>10MB).` }
                                newPartsModel.push(tooBig)
                                newPartsLog.push(tooBig)
                                continue
                            }
                        }
                    } catch (e) {
                        const fail = { type: 'text', text: `Falha ao extrair PDF(${part.filename}).` }
                        newPartsModel.push(fail)
                        newPartsLog.push(fail)
                        continue
                    }
                }
                // supported: keep original for model; sanitized for log
                newPartsModel.push(part)
                if (part.url?.startsWith('data:')) {
                    newPartsLog.push({ ...part, url: `data:application/pdf;base64,[omitted:${part.filename}]` })
                } else {
                    newPartsLog.push(part)
                }
            } else if (part?.type === 'file' && (part.mediaType?.startsWith('audio/') || part.mediaType?.startsWith('video/'))) {
                // Handle audio/video files
                if (!modelSupportsAudioVideo()) {
                    // Model doesn't support audio/video, show warning
                    const unsupported = { type: 'text', text: `Arquivo ${part.mediaType} (${part.filename}) não é suportado pelo modelo selecionado. Use um modelo como Gemini que suporta áudio e vídeo.` }
                    newPartsModel.push(unsupported)
                    newPartsLog.push(unsupported)
                    continue
                }
                // Model supports audio/video: keep original for model; sanitized for log
                newPartsModel.push(part)
                if (part.url?.startsWith('data:')) {
                    newPartsLog.push({ ...part, url: `data:${part.mediaType};base64,[omitted:${part.filename}]` })
                } else {
                    newPartsLog.push(part)
                }
            } else {
                newPartsModel.push(part)
                newPartsLog.push(part)
            }
        }
        processedMessagesModel.push({ ...(m as any), content: newPartsModel })
        processedMessagesLog.push({ ...(m as any), content: newPartsLog })
    }
    return { processedMessagesModel, processedMessagesLog }
}

export async function evaluate(definition: PromptDefinitionType, data: PromptDataType, evaluation_id: number, evaluation_descr: string | null):
    Promise<boolean> {
    const user = await assertCurrentUser()
    const user_id = await UserDao.assertIAUserId(user.preferredUsername || user.name)

    if (!user_id) throw new Error('Usuário não autenticado')

    const { model } = await getModel()
    await waitForTexts(data)
    const libraryPrompt = await getLibraryDocumentsForPrompt(data.documentosDaBiblioteca)
    const exec = await promptExecuteBuilder(definition, data, libraryPrompt)
    const messages = exec.message
    const sha256 = calcSha256(messages)

    // try to retrieve cached generations
    const cached = await retrieveFromCache(sha256, model, definition.kind, null)
    if (!cached) throw new Error('Generation not found')

    await GenerationDao.evaluateIAGeneration(user_id, cached.id, evaluation_id, evaluation_descr)

    return true
}