/**
 * Client-safe prompt utilities.
 * 
 * Functions in this module have NO server-only dependencies (no knex, no DB, no 'server-only').
 * They can be safely imported from 'use client' components.
 * 
 * Server modules should import from './prompt' which re-exports everything from here.
 */
import { slugify } from "@/lib/utils/utils"
import { PromptDataType, PromptDefinitionType, PromptDefinitionMetadataType, PromptOptionsType, TextoType } from "@/lib/ai/prompt-types"
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import yamlps from 'js-yaml'

export const formatText = (txt: TextoType, limit?: number) => {
    let s: string = txt.descr

    // Verificar se o texto é uma Data URL (data:tipo/subtipo;base64,dados)
    if (txt.texto?.startsWith('data:')) {
        // Para Data URLs, não incluir o conteúdo base64 no texto do prompt
        // O arquivo será anexado separadamente no processamento das mensagens
        s += `:\n<${txt.slug}${txt.event ? ` event="${txt.event}"` : ''}${txt.idOrigem ? ` id="${txt.idOrigem}"` : ''}${txt.label ? ` label="${txt.label}"` : ''}>\n[ARQUIVO_ANEXADO]\n</${txt.slug}>\n\n`
    } else {
        // Processamento normal para texto
        s += `:\n<${txt.slug}${txt.event ? ` event="${txt.event}"` : ''}${txt.idOrigem ? ` id="${txt.idOrigem}"` : ''}${txt.label ? ` label="${txt.label}"` : ''}>\n${limit ? txt.texto?.substring(0, limit) : txt.texto}\n</${txt.slug}>\n\n`
    }

    return s
}

export const waitForTexts = async (data: PromptDataType): Promise<void> => {
    if (data?.textos) {
        for (const texto of data.textos) {
            if (!texto.pTexto) continue
            const c = await texto.pTexto
            if (c === undefined) throw new Error(`Conteúdo não encontrado para ${texto.label} (${texto.descr}) no evento ${texto.event}`)
            if (c?.errorMsg) throw new Error(c.errorMsg)
            texto.texto = c?.conteudo
            delete texto.pTexto
        }
    }
}

export async function getPiecesWithContent(dadosDoProcesso: DadosDoProcessoType, dossierNumber: string, skipError: boolean = false): Promise<TextoType[]> {
    let pecasComConteudo: TextoType[] = []
    for (const peca of dadosDoProcesso.pecasSelecionadas) {
        if (peca.pConteudo === undefined && peca.conteudo === undefined && !skipError) {
            throw new Error(`Conteúdo não encontrado no processo ${dossierNumber}, peça ${peca.id}, rótulo ${peca.rotulo}`)
        }
        const slug = await slugify(peca.descr)
        pecasComConteudo.push({ id: peca.id, numeroDoProcesso: peca.numeroDoProcesso, event: peca.numeroDoEvento, idOrigem: peca.idOrigem, label: peca.rotulo, descr: peca.descr, slug, pTexto: peca.pConteudo, texto: peca.conteudo, sigilo: peca.sigilo })
    }
    return pecasComConteudo
}

export const promptDefinitionFromDefinitionAndOptions = (definition: PromptDefinitionType, options: PromptOptionsType): PromptDefinitionType => {
    return {
        kind: definition.kind,
        systemPrompt: options.overrideSystemPrompt !== undefined ? options.overrideSystemPrompt : definition.systemPrompt,
        prompt: options.overridePrompt !== undefined ? options.overridePrompt : definition.prompt,
        jsonSchema: options.overrideJsonSchema !== undefined ? options.overrideJsonSchema : definition.jsonSchema,
        format: options.overrideFormat !== undefined ? options.overrideFormat : definition.format,
        template: options.overrideTemplate !== undefined ? options.overrideTemplate : definition.template,
        model: options.overrideModel !== undefined ? options.overrideModel : definition.model,
        cacheControl: options.cacheControl !== undefined ? options.cacheControl : definition.cacheControl
    }
}


export const promptDefinitionFromMarkdown = (slug, md: string): PromptDefinitionType => {
    // Extract YAML front matter
    const frontMatterMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
    let metadataRaw: string | undefined
    let bodyMd = md
    if (frontMatterMatch) {
        metadataRaw = frontMatterMatch[1]
        bodyMd = md.slice(frontMatterMatch[0].length)
    }

    const regex = /(?:^# (?<tag>SYSTEM PROMPT|PROMPT|JSON SCHEMA|FORMAT)\s*)$/gms;

    // Create an object with the different parts of the markdown
    const parts = bodyMd.split(regex).reduce((acc, part, index, array) => {
        if (index % 2 === 0) {
            const tag = array[index - 1]?.trim()
            if (tag) {
                acc[slugify(tag).replaceAll('-', '_')] = part.trim()
            }
        }
        return acc;
    }, {} as { prompt: string, system_prompt?: string, json_schema?: string, format?: string, template?: string })

    const { prompt, system_prompt, json_schema, format, template } = parts

    return {
        kind: slug, prompt, systemPrompt: system_prompt, jsonSchema: json_schema, format, template,
        metadata: metadataRaw ? yamlps.load(metadataRaw) as PromptDefinitionMetadataType : undefined,
        cacheControl: true
    }
}
