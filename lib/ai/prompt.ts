import { ModelMessage, jsonSchema } from "ai"
import { slugify } from "@/lib/utils/utils"
import { PromptDataType, PromptExecuteType, PromptExecuteParamsType, PromptDefinitionType, PromptOptionsType, TextoType } from "@/lib/ai/prompt-types"
import { buildFormatter } from "@/lib/ai/format"
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import { fixPromptForAutoJson, promptJsonSchemaFromPromptMarkdown } from "./auto-json"
import { formatDateDDMMYYYY } from "../utils/date"

export const formatText = (txt: TextoType, limit?: number) => {
    let s: string = txt.descr
    s += `:\n<${txt.slug}${txt.event ? ` event="${txt.event}"` : ''}${txt.idOrigem ? ` id="${txt.idOrigem}"` : ''}${txt.label ? ` label="${txt.label}"` : ''}>\n${limit ? txt.texto?.substring(0, limit) : txt.texto}\n</${txt.slug}>\n\n`
    return s
}

export const applyTextsAndVariables = (text: string, data: PromptDataType, jsonSchema?: string, template?: string): string => {
    if (!text) return ''

    const allTexts = `${data.textos.reduce((acc, txt) => acc + formatText(txt), '')}`

    // Replace internal prompts and increment markdown heading levels by one
    text = text.replace(/{{prompt:([a-z_]+)}}/g, (match, promptName) => {
        const internalPrompt = internalPrompts[promptName]
        if (!internalPrompt) throw new Error(`Prompt '${promptName}' não encontrado`)
        if (!internalPrompt.prompt) throw new Error(`Prompt '${promptName}' não tem conteúdo`)
        let promptText = internalPrompt.prompt.split('\n---\n')[0] // get only the first part of the prompt, before ---
        promptText = promptText.replace(/^(#{1,6})(\s*)/gm, (match: string, hashes: string, spaces: string) => {
            return hashes.length >= 6 ? match : `${hashes}#${spaces}`
        })
        return promptText
    })

    text = text.replace('{{jsonSchema}}', jsonSchema || 'JSON Schema não definido')

    text = text.replace('{{textos}}', allTexts)

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
            // console.log('peca', peca)
            throw new Error(`Conteúdo não encontrado no processo ${dossierNumber}, peça ${peca.id}, rótulo ${peca.rotulo}`)
        }
        const slug = await slugify(peca.descr)
        pecasComConteudo.push({ id: peca.id, numeroDoProcesso: peca.numeroDoProcesso, event: peca.numeroDoEvento, idOrigem: peca.idOrigem, label: peca.rotulo, descr: peca.descr, slug, pTexto: peca.pConteudo, texto: peca.conteudo, sigilo: peca.sigilo })
    }
    return pecasComConteudo
}

export const promptExecuteBuilder = (definition: PromptDefinitionType, data: PromptDataType): PromptExecuteType => {
    const message: ModelMessage[] = []
    if (definition.systemPrompt) {
        definition.systemPrompt.split('\n---\n').forEach(part => {
            message.push({ role: 'system', content: applyTextsAndVariables(part, data, definition.jsonSchema, definition.template) })
        })
    }

    // add {{textos}} to the prompt if it doesn't have it
    let prompt = definition.prompt
    if (prompt && !prompt.includes('{{') && (!definition.systemPrompt || !definition.systemPrompt.includes('{{')))
        prompt = `${prompt}\n\n{{textos}}`

    if (prompt)
        prompt = fixPromptForAutoJson(prompt)

    if (prompt && !definition.jsonSchema) {
        definition.jsonSchema = promptJsonSchemaFromPromptMarkdown(prompt, true)
    }

    const promptContent: string = applyTextsAndVariables(prompt, data, definition.jsonSchema, definition.template)
    if (prompt) {
        message.push({ role: 'user', content: promptContent })
    }

    const params: PromptExecuteParamsType = {}
    if (definition.jsonSchema)
        params.structuredOutputs = { schemaName: 'structuredOutputs', schemaDescription: 'Structured Outputs', schema: jsonSchema(JSON.parse(definition.jsonSchema)) }
    if (definition.format)
        params.format = buildFormatter(definition.format)
    return { message, params, fixedPrompt: promptContent }
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

type JsonSchemaPropertyType = {
    type: string
    description: string
    properties?: Record<string, JsonSchemaPropertyType>
}

function mapToOrderedObject(value: any): any {
    if (value instanceof Map) {
        const orderedObj: Record<string, any> = {};
        for (const [key, val] of value.entries()) {
            orderedObj[key] = mapToOrderedObject(val); // chamada recursiva
        }
        return orderedObj;
    } else if (Array.isArray(value)) {
        return value.map(item => mapToOrderedObject(item)); // trata arrays que podem conter Maps
    } else {
        return value; // valor primitivo ou objeto comum
    }
}

function mapToOrderedJson<T>(map: Map<string, T>, pretty: boolean = false): string {
    const orderedObj = mapToOrderedObject(map);
    return JSON.stringify(orderedObj, null, pretty ? 2 : 0);
}

export const promptDefinitionFromMarkdown = (slug, md: string): PromptDefinitionType => {
    const regex = /(?:^# (?<tag>SYSTEM PROMPT|PROMPT|JSON SCHEMA|FORMAT)\s*)$/gms;

    // Create an object with the different parts of the markdown
    const parts = md.split(regex).reduce((acc, part, index, array) => {
        if (index % 2 === 0) {
            const tag = array[index - 1]?.trim()
            if (tag) {
                acc[slugify(tag).replaceAll('-', '_')] = part.trim()
            }
        }
        return acc;
    }, {} as { prompt: string, system_prompt?: string, json_schema?: string, format?: string, template?: string })

    const { prompt, system_prompt, json_schema, format, template } = parts

    return { kind: slug, prompt, systemPrompt: system_prompt, jsonSchema: json_schema, format, template, cacheControl: true }
}


export const promptExecutionFromMarkdown = (md: string): (data: PromptDataType) => PromptExecuteType => {
    const definition = promptDefinitionFromMarkdown('md', md)

    return (data) => promptExecuteBuilder(definition, data)
}

export function getPromptIdentifier(prompt: string) {
    let promptUnderscore = prompt.replace(/-/g, '_')
    let buildPrompt = internalPrompts[promptUnderscore]
    if (!buildPrompt && prompt.startsWith('resumo-')) {
        promptUnderscore = 'resumo_peca'
    }
    return promptUnderscore
}

export function getInternalPrompt(slug: string): PromptDefinitionType {
    return internalPrompts[getPromptIdentifier(slug)]
}

import ementa from '@/prompts/ementa.md'
import int_testar from "@/prompts/int-testar.md"
import int_gerar_perguntas from "@/prompts/int-gerar-perguntas.md"
import resumo_peca from "@/prompts/resumo-peca.md"
import resumo_peticao_inicial from "@/prompts/resumo-peticao-inicial.md"
import resumo_contestacao from "@/prompts/resumo-contestacao.md"
import resumo_informacao_em_mandado_de_seguranca from "@/prompts/resumo-informacao-em-mandado-de-seguranca.md"
import resumo_sentenca from "@/prompts/resumo-sentenca.md"
import resumo_recurso_inominado from "@/prompts/resumo-recurso-inominado.md"
import analise from "@/prompts/analise.md"
import analise_tr from "@/prompts/analise-tr.md"
import analise_completa from '@/prompts/analise-completa.md'
import resumo from "@/prompts/resumo.md"
import revisao from "@/prompts/revisao.md"
import refinamento from "@/prompts/refinamento.md"
import sentenca from "@/prompts/sentenca.md"
import voto from '@/prompts/voto.md'
import int_identificar_categoria_de_peca from '@/prompts/int-identificar-categoria-de-peca.md'
import int_fix_index from '@/prompts/int-fix-index.md'
import litigancia_predatoria from '@/prompts/litigancia-predatoria.md'
import pedidos_de_peticao_inicial from '@/prompts/pedidos-de-peticao-inicial.md'
import pedidos_fundamentacoes_e_dispositivos from '@/prompts/pedidos-fundamentacoes-e-dispositivos.md'
import indice from '@/prompts/indice.md'
import chat from '@/prompts/chat.md'
import relatorio_de_processo_coletivo_ou_criminal from '@/prompts/relatorio-de-processo-coletivo-ou-criminal.md'
import chat_standalone from '@/prompts/chat-standalone.md'
import relatorio_completo_criminal from '@/prompts/relatorio-completo-criminal.md'
import minuta_de_despacho_de_acordo_9_dias from '@/prompts/minuta-de-despacho-de-acordo-9-dias.md'
import template from '@/prompts/template.md'
import prev_ppp from '@/prompts/prev-ppp.md'
import prev_apesp_pontos_controvertidos_primeira_instancia from '@/prompts/prev-apesp-pontos-controvertidos-primeira-instancia.md'
import prev_apesp_pontos_controvertidos_segunda_instancia from '@/prompts/prev-apesp-pontos-controvertidos-segunda-instancia.md'
import prev_apesp_pontos_controvertidos_segunda_instancia_com_ppp from '@/prompts/prev-apesp-pontos-controvertidos-segunda-instancia-com-ppp.md'
import prev_bi_analise_de_laudo from '@/prompts/prev-bi-analise-de-laudo.md'
import prev_bi_sentenca_laudo_favoravel from '@/prompts/prev-bi-sentenca-laudo-favoravel.md'
import prev_bi_sentenca_laudo_desfavoravel from '@/prompts/prev-bi-sentenca-laudo-desfavoravel.md'
import linguagem_simples from '@/prompts/linguagem-simples.md'
import relatorio_de_apelacao_e_triagem from '@/prompts/relatorio-de-apelacao-e-triagem.md'

// Enum for the different types of prompts
export const internalPrompts = {
    ementa: promptDefinitionFromMarkdown('ementa', ementa),
    int_testar: promptDefinitionFromMarkdown('int_testar', int_testar),
    int_gerar_perguntas: promptDefinitionFromMarkdown('int_gerar_perguntas', int_gerar_perguntas),
    resumo_peca: promptDefinitionFromMarkdown('resumo_peca', resumo_peca),
    resumo_peticao_inicial: promptDefinitionFromMarkdown('resumo_peticao_inicial', resumo_peticao_inicial),
    resumo_contestacao: promptDefinitionFromMarkdown('resumo_contestacao', resumo_contestacao),
    resumo_informacao_em_mandado_de_seguranca: promptDefinitionFromMarkdown('resumo_informacao_em_mandado_de_seguranca', resumo_informacao_em_mandado_de_seguranca),
    resumo_sentenca: promptDefinitionFromMarkdown('resumo_sentenca', resumo_sentenca),
    resumo_recurso_inominado: promptDefinitionFromMarkdown('resumo_recurso_inominado', resumo_recurso_inominado),
    analise: promptDefinitionFromMarkdown('analise', analise),
    analise_tr: promptDefinitionFromMarkdown('analise_tr', analise_tr),
    analise_completa: promptDefinitionFromMarkdown('analise_completa', analise_completa),
    resumo: promptDefinitionFromMarkdown('resumo', resumo),
    revisao: promptDefinitionFromMarkdown('revisao', revisao),
    refinamento: promptDefinitionFromMarkdown('refinamento', refinamento),
    sentenca: promptDefinitionFromMarkdown('sentenca', sentenca),
    voto: promptDefinitionFromMarkdown('voto', voto),
    int_identificar_categoria_de_peca: promptDefinitionFromMarkdown('int_identificar_categoria_de_peca', int_identificar_categoria_de_peca),
    int_fix_index: promptDefinitionFromMarkdown('int_fix_index', int_fix_index),
    litigancia_predatoria: promptDefinitionFromMarkdown('litigancia_predatoria', litigancia_predatoria),
    pedidos_de_peticao_inicial: promptDefinitionFromMarkdown('pedidos_de_peticao_inicial', pedidos_de_peticao_inicial),
    pedidos_fundamentacoes_e_dispositivos: promptDefinitionFromMarkdown('pedidos_fundamentacoes_e_dispositivos', pedidos_fundamentacoes_e_dispositivos),
    indice: promptDefinitionFromMarkdown('indice', indice),
    chat: promptDefinitionFromMarkdown('chat', chat),
    relatorio_de_processo_coletivo_ou_criminal: promptDefinitionFromMarkdown('relatorio_de_processo_coletivo_ou_criminal', relatorio_de_processo_coletivo_ou_criminal),
    chat_standalone: promptDefinitionFromMarkdown('chat_standalone', chat_standalone),
    relatorio_completo_criminal: promptDefinitionFromMarkdown('relatorio_completo_criminal', relatorio_completo_criminal),
    minuta_de_despacho_de_acordo_9_dias: promptDefinitionFromMarkdown('minuta_de_despacho_de_acordo_9_dias', minuta_de_despacho_de_acordo_9_dias),
    template: promptDefinitionFromMarkdown('template', template),
    prev_ppp: promptDefinitionFromMarkdown('prev_ppp', prev_ppp),
    prev_apesp_pontos_controvertidos_primeira_instancia: promptDefinitionFromMarkdown('prev_apesp_pontos_controvertidos_primeira_instancia', prev_apesp_pontos_controvertidos_primeira_instancia),
    prev_apesp_pontos_controvertidos_segunda_instancia: promptDefinitionFromMarkdown('prev_apesp_pontos_controvertidos_segunda_instancia', prev_apesp_pontos_controvertidos_segunda_instancia),
    prev_apesp_pontos_controvertidos_segunda_instancia_com_ppp: promptDefinitionFromMarkdown('prev_apesp_pontos_controvertidos_segunda_instancia_com_ppp', prev_apesp_pontos_controvertidos_segunda_instancia_com_ppp),
    prev_bi_analise_de_laudo: promptDefinitionFromMarkdown('prev_bi_analise_de_laudo', prev_bi_analise_de_laudo),
    prev_bi_sentenca_laudo_favoravel: promptDefinitionFromMarkdown('prev_bi_sentenca_laudo_favoravel', prev_bi_sentenca_laudo_favoravel),
    prev_bi_sentenca_laudo_desfavoravel: promptDefinitionFromMarkdown('prev_bi_sentenca_laudo_desfavoravel', prev_bi_sentenca_laudo_desfavoravel),
    linguagem_simples: promptDefinitionFromMarkdown('linguagem_simples', linguagem_simples),
    relatorio_de_apelacao_e_triagem: promptDefinitionFromMarkdown('relatorio_de_apelacao_e_triagem', relatorio_de_apelacao_e_triagem),
}
