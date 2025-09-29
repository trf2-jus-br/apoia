'use server'

import { streamText, StreamTextResult, LanguageModel, streamObject, StreamObjectResult, DeepPartial, ModelMessage, generateText, ToolSet, stepCountIs } from 'ai'
import { IAGenerated, IAGeneration } from '../db/mysql-types'
import { Dao } from '../db/mysql'
import { assertCourtId, assertCurrentUser, assertSystemCode, UserType } from '../user'
import { PromptAdditionalInformationType, PromptDataType, PromptDefinitionType, PromptExecutionResultsType, PromptOptionsType, TextoType } from '@/lib/ai/prompt-types'
import { promptExecuteBuilder, waitForTexts } from './prompt'
import { calcSha256 } from '../utils/hash'
import { envString } from '../utils/env'
import { anonymizeText } from '../anonym/anonym'
import { getModel } from './model-server'
import { modelCalcUsage, Model, FileTypeEnum } from './model-types'
import { cookies } from 'next/headers';
import { clipPieces } from './clip-pieces'
import { assert } from 'console'
import { pdfToText } from '../pdf/pdf'
import { assertAnonimizacaoAutomatica } from '../proc/sigilo'

export async function retrieveFromCache(sha256: string, model: string, prompt: string, attempt: number | null): Promise<IAGenerated | undefined> {
    const cached = await Dao.retrieveIAGeneration({ sha256, model, prompt, attempt })
    if (cached) return cached
    return undefined
}

async function saveToCache(data: IAGeneration): Promise<number | undefined> {
    const inserted = await Dao.insertIAGeneration(data)
    if (!inserted) return undefined
    return inserted.id
}

async function saveLog(user: UserType, additionalInformation: PromptAdditionalInformationType, model: string, usage, sha256: string, kind: string, text: string, attempt: number, messages: ModelMessage[]) {
    const system_id = await Dao.assertSystemId(await assertSystemCode(user))
    const dossier_id = additionalInformation?.dossierCode ? (await Dao.assertIADossierId(additionalInformation.dossierCode, system_id, undefined, undefined)) : null
    const calculedUsage = modelCalcUsage(
        model,
        (usage.inputTokens || 0) + (usage.cachedInputTokens || 0),
        (usage.reasoningTokens || 0) + (usage.outputTokens || 0)
    )
    const generationId = await saveToCache({
        sha256, model, prompt: kind, generation: text, attempt: attempt || null,
        prompt_payload: JSON.stringify(messages), dossier_id, document_id: null,
        cached_input_tokens: usage.cachedInputTokens || 0, input_tokens: usage.inputTokens || 0, output_tokens: usage.outputTokens || 0, reasoning_tokens: usage.reasoningTokens || 0,
        approximate_cost: calculedUsage.approximate_cost
    })
    return generationId
}

// write response to a file for debugging
function writeResponseToFile(kind: string, messages: ModelMessage[], text: string) {
    const path: string = envString('SAVE_PROMPT_RESULTS_PATH') || ''
    if (envString('NODE_ENV') === 'development' && path) {
        const fs = require('fs')
        const currentDate = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0]
        fs.writeFileSync(`${path}/${currentDate}-${kind}.txt`, `${messages[0].content}${messages[1]?.content ? `\n\n${messages[1].content}` : ''}\n\n---\n\n${text}`)
    }
}

export async function generateContent(definition: PromptDefinitionType, data: PromptDataType): Promise<IAGenerated> {
    const results: PromptExecutionResultsType = {}
    const pResult = await streamContent(definition, data, results)
    const stream = await pResult

    let text: string
    if (typeof stream === 'string') {
        text = stream
    } else {
        try {
            text = ''
            for await (const textPart of stream.textStream) {
                process.stdout.write(textPart)
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

export async function writeUsage(usage, model: string, user_id: number | undefined, court_id: number | undefined) {
    const { cachedInputTokens, inputTokens, outputTokens, reasoningTokens } = usage
    const calculedUsage = modelCalcUsage(
        model,
        (inputTokens || 0) + (cachedInputTokens || 0),
        (reasoningTokens || 0) + (outputTokens || 0)
    )
    if (user_id && court_id)
        await Dao.addToIAUserDailyUsage(user_id, court_id, calculedUsage.input_tokens, calculedUsage.output_tokens, calculedUsage.approximate_cost)
}
export async function streamContent(definition: PromptDefinitionType, data: PromptDataType, results?: PromptExecutionResultsType, additionalInformation?: PromptAdditionalInformationType):
    Promise<StreamTextResult<ToolSet, Partial<any>> | StreamObjectResult<DeepPartial<any>, any, never> | string> {
    // const user = await getCurrentUser()
    // if (!user) return Response.json({ errormsg: 'Usuário não autenticado' }, { status: 401 })
    console.log('will build prompt', definition.kind)
    await waitForTexts(data)

    // Anonymize text if the cookie is set
    const cookiesList = await (cookies());
    const anonymize = cookiesList.get('anonymize')?.value === 'true'
    data.textos = data.textos.map((texto: TextoType) => {
        if (anonymize || assertAnonimizacaoAutomatica(texto.sigilo)) {
            console.log(`Anonymizing piece ${texto.id} (${texto.descr}) with confidentiality level ${texto.sigilo}`)
            return { ...texto, texto: anonymizeText(texto.texto).text }
        } else {
            return texto
        }
    })

    // Get the model so that we can clip the pieces if necessary
    const { model: modelPreSelected } = await getModel({ structuredOutputs: false, overrideModel: definition.model })
    data.textos = clipPieces(modelPreSelected, data.textos)

    const exec = promptExecuteBuilder(definition, data)
    const messages = exec.message
    const structuredOutputs = exec.params?.structuredOutputs
    const { model, modelRef, apiKeyFromEnv } = await getModel({ structuredOutputs: !!structuredOutputs, overrideModel: definition.model })

    if (results) results.model = model
    const sha256 = calcSha256(messages)
    if (results) results.sha256 = sha256
    const attempt = definition?.cacheControl !== true && definition?.cacheControl || null

    if (results?.messagesOnly) {
        return JSON.stringify(messages)
    }

    // try to retrieve cached generations
    if (definition?.cacheControl !== false) {
        const cached = await retrieveFromCache(sha256, model, definition.kind, attempt)
        if (cached) {
            // Ensure downstream code receives the persisted generation id
            if (results) {
                results.generationId = cached.id
                results.model = cached.model || model
            }
            return cached.generation
        }
    }

    // writeResponseToFile(definition, messages, "antes de executar")
    // if (1 == 1) throw new Error('Interrupted')

    return generateAndStreamContent(model, structuredOutputs, definition?.cacheControl, definition?.kind, modelRef, messages, sha256, additionalInformation, results, attempt, apiKeyFromEnv)
}

export async function generateAndStreamContent(model: string, structuredOutputs: any, cacheControl: number | boolean, kind: string, modelRef: LanguageModel, messages: ModelMessage[], sha256: string, additionalInformation: PromptAdditionalInformationType, results?: PromptExecutionResultsType, attempt?: number | null, apiKeyFromEnv?: boolean, tools?: Record<string, any>):
    Promise<StreamTextResult<ToolSet, Partial<any>> | StreamObjectResult<DeepPartial<any>, any, never> | string> {
    const pUser = assertCurrentUser()
    const user = await pUser
    const user_id = await Dao.assertIAUserId(user.preferredUsername || user.name)
    const court_id = await assertCourtId(user)

    // --- PDF processing & logging sanitization ---
    const modelSupportsPdf = () => {
        const details = Object.values(Model).find(m => m.name === model)
        return !!details?.supportedFileTypes?.includes(FileTypeEnum.PDF)
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
            } else {
                newPartsModel.push(part)
                newPartsLog.push(part)
            }
        }
        processedMessagesModel.push({ ...(m as any), content: newPartsModel })
        processedMessagesLog.push({ ...(m as any), content: newPartsLog })
    }

    if (!structuredOutputs) { // text streaming branch
        console.log('streaming text', kind) //, messages, modelRef)
        if (apiKeyFromEnv) {
            await Dao.assertIAUserDailyUsageId(user_id, court_id)
        }
        writeResponseToFile(kind, processedMessagesLog, 'antes de executar')
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
        const pResult = streamText({
            model: modelRef as LanguageModel,
            messages: processedMessagesModel,
            maxRetries: 0,
            onStepFinish: ({ text, usage }) => {
                process.stdout.write(text)
            },
            onError: (error) => {
                console.error('Error during streaming:', error)
            },
            onFinish: async ({ text, usage }) => {
                if (apiKeyFromEnv)
                    writeUsage(usage, model, user_id, court_id)
                if (cacheControl !== false) {
                    const generationId = await saveLog(user, additionalInformation, model, usage, sha256, kind, text, attempt, processedMessagesLog)
                    if (results) results.generationId = generationId
                }
                writeResponseToFile(kind, processedMessagesLog, text)
            },
            tools,
            stopWhen: stepCountIs(10)
            // maxSteps: tools ? 10 : undefined, // Limit the number of steps to avoid infinite loops
        })
        return pResult as any
        // }
    } else {
        console.log('streaming object', kind) //, messages, modelRef, structuredOutputs.schema)
        if (apiKeyFromEnv) {
            await Dao.assertIAUserDailyUsageId(user_id, court_id)
        }
        const pResult = streamObject({
            model: modelRef as LanguageModel,
            messages: processedMessagesModel,
            maxRetries: 1,
            onFinish: async ({ object, usage }) => {
                if (apiKeyFromEnv)
                    writeUsage(usage, model, user_id, court_id)
                if (cacheControl !== false) {
                    const generationId = await saveLog(user, additionalInformation, model, usage, sha256, kind, JSON.stringify(object), attempt, processedMessagesLog)
                    if (results) results.generationId = generationId
                }
                writeResponseToFile(kind, processedMessagesLog, JSON.stringify(object))
            },
            schemaName: `schema${kind}`,
            schemaDescription: `A schema for the prompt ${kind}`,
            schema: structuredOutputs.schema,
        })
        // @ts-ignore-next-line
        return pResult
    }
}

export async function evaluate(definition: PromptDefinitionType, data: PromptDataType, evaluation_id: number, evaluation_descr: string | null):
    Promise<boolean> {
    const user = await assertCurrentUser()
    const user_id = await Dao.assertIAUserId(user.preferredUsername || user.name)

    if (!user_id) throw new Error('Usuário não autenticado')

    const { model } = await getModel()
    await waitForTexts(data)
    const exec = promptExecuteBuilder(definition, data)
    const messages = exec.message
    const sha256 = calcSha256(messages)

    // try to retrieve cached generations
    const cached = await retrieveFromCache(sha256, model, definition.kind, null)
    if (!cached) throw new Error('Generation not found')

    await Dao.evaluateIAGeneration(user_id, cached.id, evaluation_id, evaluation_descr)

    return true
}