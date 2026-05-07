import { ModelMessage, jsonSchema } from "ai"
import { PromptDataType, PromptExecuteType, PromptExecuteParamsType, PromptDefinitionType, TextoType } from "@/lib/ai/prompt-types"
import { buildFormatter } from "@/lib/ai/format"
import { fixPromptForAutoJson, promptJsonSchemaFromPromptMarkdown } from "./auto-json"
import { formatDateDDMMYYYY } from "../utils/date"
import devLog from "@/lib/utils/log"
import { getPromptDefinition } from "./prompt-store"
import { formatText } from "./prompt-client"

// Re-export client-safe functions for backward compatibility
export { formatText, waitForTexts, getPiecesWithContent, promptDefinitionFromDefinitionAndOptions, promptDefinitionFromMarkdown } from './prompt-client'

export const applyTextsAndVariables = async (text: string, data: PromptDataType, jsonSchema?: string, template?: string, libraryPrompt?: string): Promise<string> => {
    if (!text) return ''

    const allTexts = `${data.textos.reduce((acc, txt) => acc + formatText(txt), '')}`

    // Pre-resolve all {{prompt:name}} references from database
    const promptRefs = [...text.matchAll(/{{prompt:([a-z_]+)}}/g)]
    const resolvedPrompts: Record<string, PromptDefinitionType> = {}
    for (const [, promptName] of promptRefs) {
        if (!resolvedPrompts[promptName]) {
            resolvedPrompts[promptName] = await getPromptDefinition(promptName)
        }
    }

    // Replace internal prompts and increment markdown heading levels by one
    text = text.replace(/{{prompt:([a-z_]+)}}/g, (match, promptName) => {
        const def = resolvedPrompts[promptName]
        if (!def) throw new Error(`Prompt '${promptName}' não encontrado`)
        if (!def.prompt) throw new Error(`Prompt '${promptName}' não tem conteúdo`)
        let promptText = def.prompt.split('\n---\n')[0] // get only the first part of the prompt, before ---
        promptText = promptText.replace(/^(#{1,6})(\s*)/gm, (match: string, hashes: string, spaces: string) => {
            return hashes.length >= 6 ? match : `${hashes}#${spaces}`
        })
        return promptText
    })

    text = text.replace(/{{semPromptPadrao}}\n?/g, '')

    text = text.replace('{{jsonSchema}}', jsonSchema || 'JSON Schema não definido')

    text = text.replace('{{textos}}', allTexts)

    text = text.replace('{{biblioteca}}', libraryPrompt)

    text = text.replace('{{salvaguardas}}', salvaguardas)

    text = text.replace('{{numeroDoProcesso}}', data.numeroDoProcesso || 'Número do processo não definido')

    text = text.replace('{{dataAtual}}', formatDateDDMMYYYY(new Date()))

    text = text.replace('{{template}}', template ? `<template>\n${template}\n</template>` : '')

    text = text.replace(/{{textos\.limit\((\d+)\)}}/g, (match, limit) => {
        const limitNumber = parseInt(limit, 10)
        const limitedTexts = data.textos.reduce((acc, txt) => acc + formatText(txt, limitNumber), '')
        return limitedTexts
    })

    text = text.replace(/{{textos\.([a-z_]+)}}/g, (match, slug) => {
        const found = data.textos.find(txt => txt.slug === slug)
        if (!found) throw new Error(`Slug '${slug}' não encontrado`)
        return `${found.descr}:\n<${found.slug}>\n${found.texto}\n</${found.slug}>\n\n`
    })

    return text
}

export const promptExecuteBuilder = async (definition: PromptDefinitionType, data: PromptDataType, libraryPrompt?: string): Promise<PromptExecuteType> => {
    const message: ModelMessage[] = []
    if (definition?.kind !== 'chat' && definition?.kind !== 'chat_standalone' && !(definition?.systemPrompt?.includes('{{semPromptPadrao}}') || definition?.prompt?.includes('{{semPromptPadrao}}'))) {
        const systemContent = definition.metadata?.target === 'PROCESSO' ? sistema : sistemaTextual
        for (const part of systemContent.split(/^\s*---\s*$/gm)) {
            const content = await applyTextsAndVariables(part, data, definition.jsonSchema, definition.template, libraryPrompt)
            devLog('System message content type:', typeof content, 'isArray:', Array.isArray(content))
            message.push({ role: 'system', content } as ModelMessage)
        }
    }

    if (definition.systemPrompt) {
        for (const part of definition.systemPrompt.split(/^\s*---\s*$/gm)) {
            const content = await applyTextsAndVariables(part, data, definition.jsonSchema, definition.template, libraryPrompt)
            devLog('SystemPrompt content type:', typeof content, 'isArray:', Array.isArray(content))
            message.push({ role: 'system', content } as ModelMessage)
        }
    }

    // add {{textos}} to the prompt if it doesn't have it
    let prompt = definition.prompt
    if (prompt && !prompt.includes('{{') && (!definition.systemPrompt || !definition.systemPrompt.includes('{{')))
        prompt = `Leia cuidadosamente os textos a seguir:\n\n{{textos}}\n\n${prompt}`

    if (prompt)
        prompt = fixPromptForAutoJson(prompt)

    if (prompt && !definition.jsonSchema) {
        definition.jsonSchema = promptJsonSchemaFromPromptMarkdown(prompt, true)
    }

    const promptContent: string = await applyTextsAndVariables(prompt, data, definition.jsonSchema, definition.template)

    if (prompt) {
        // Verificar se há arquivos (Data URLs) nos textos
        const filesInTexts = data.textos.filter(txt => txt.texto?.startsWith('data:'))

        if (filesInTexts.length > 0) {
            // Para mensagens com arquivos, usar content array
            const contentParts: any[] = [
                { type: 'text', text: promptContent }
            ]

            // Adicionar cada arquivo como parte da mensagem
            for (const txt of filesInTexts) {
                if (txt.texto?.startsWith('data:')) {
                    // Extrair tipo MIME da Data URL usando operações de string (evita stack overflow com base64 grandes)
                    const base64Marker = ';base64,'
                    const base64Index = txt.texto.indexOf(base64Marker)
                    if (base64Index !== -1) {
                        const mediaType = txt.texto.substring('data:'.length, base64Index)
                        const data = txt.texto.substring(base64Index + base64Marker.length)
                        contentParts.push({
                            type: 'file',
                            filename: txt.descr || 'arquivo',
                            mediaType,
                            data
                        })
                    }
                }
            }

            message.push({ role: 'user', content: contentParts } as ModelMessage)
        } else {
            // Mensagem normal (sem arquivos) - content como string
            message.push({ role: 'user', content: promptContent } as ModelMessage)
        }
    }

    const params: PromptExecuteParamsType = {}
    if (definition.jsonSchema)
        params.structuredOutputs = { schemaName: 'structuredOutputs', schemaDescription: 'Structured Outputs', schema: jsonSchema(JSON.parse(definition.jsonSchema)) }
    if (definition.format)
        params.format = buildFormatter(definition.format)

    return { message, params, fixedPrompt: promptContent }
}

import salvaguardas from '@/prompts/salvaguardas.md'
import sistema from '@/prompts/sistema.md'
import sistemaTextual from '@/prompts/sistema-textual.md'
