import { IAPrompt } from "../db/mysql-types"
import { PecaType } from "../proc/process-types"
import { slugify } from "../utils/utils"
import devLog from "../utils/log"
import { GeneratedContent, PromptDataType, PromptDefinitionType, TextoType } from "./prompt-types"
import { getPromptDefinition, getPromptDefinitionByUuid } from "./prompt-store"

/**
 * Build requests from an aggregator's workflow successors (DB-driven).
 * Each successor UUID is resolved to a prompt definition.
 */
async function buildRequestsFromWorkflow(
    successors: { uuid: string; optional?: boolean; condition?: string }[],
    pecasComConteudo: TextoType[],
    numeroDoProcesso: string,
    documentosDaBiblioteca: string[] | undefined,
): Promise<GeneratedContent[]> {
    const requestArray: GeneratedContent[] = []

    for (const step of successors) {
        const def = await getPromptDefinitionByUuid(step.uuid).catch(e => {
            devLog(`[build-requests] Could not resolve successor UUID ${step.uuid}: ${e.message}`)
            return null
        })
        if (!def) continue

        // Skip RESUMOS fan-out (handled separately when needed)
        if (def.kind === 'resumos') continue

        const data: PromptDataType = { numeroDoProcesso, textos: pecasComConteudo, documentosDaBiblioteca }
        requestArray.push({
            documentCode: null,
            documentDescr: null,
            data,
            title: def.name || def.kind,
            produto: def.kind,
            promptSlug: def.kind,
            internalPrompt: def,
        })
    }

    return requestArray
}

export const buildRequests = async (prompt: IAPrompt, documentosDaBiblioteca: string[] | undefined, numeroDoProcesso: string, selectedPieces: PecaType[], contents?: { [key: number]: string }): Promise<GeneratedContent[]> => {
    const requestArray: GeneratedContent[] = []
    const pecasComConteudo: TextoType[] = selectedPieces.map(peca => ({ id: peca.id, numeroDoProcesso: peca.numeroDoProcesso, event: peca.numeroDoEvento, idOrigem: peca.idOrigem, label: peca.rotulo, descr: peca.descr, slug: slugify(peca.descr), texto: peca.conteudo || contents?.[peca.id], sigilo: peca.sigilo }))

    // Internal seeded prompt: use workflow successors from DB
    if (prompt.library) {
        // Use DB workflow successors (from aggregator .md files synced by sync engine)
        if (prompt.content?.workflow?.successors?.length) {
            const workflowRequests = await buildRequestsFromWorkflow(
                prompt.content.workflow.successors,
                pecasComConteudo,
                numeroDoProcesso,
                documentosDaBiblioteca,
            )
            requestArray.push(...workflowRequests)
        }
    } else {
        if (prompt.content.summary === 'SIM') {
            for (const peca of pecasComConteudo) {
                const definition = await getPromptDefinition(`resumo-${peca.slug}`)
                const data: PromptDataType = {
                    numeroDoProcesso,
                    textos: [peca],
                    documentosDaBiblioteca
                }
                requestArray.push({ documentCode: peca.id || null, documentDescr: peca.descr, documentLocation: peca.event, documentLink: `/api/v1/process/${peca.numeroDoProcesso || numeroDoProcesso}/piece/${peca.id}/binary`, data, title: peca.descr, produto: definition.kind, promptSlug: definition.kind, internalPrompt: definition })
            }
        }
        const definition: PromptDefinitionType = {
            kind: `prompt-${prompt.id}`,
            prompt: prompt.content.prompt,
            systemPrompt: prompt.content.system_prompt,
            jsonSchema: prompt.content.json_schema,
            format: prompt.content.format,
            template: prompt.content.template,
            cacheControl: true,
            dbId: prompt.id,
        }
        const req: GeneratedContent = {
            documentCode: null,
            documentDescr: null,
            data: {
                numeroDoProcesso,
                textos: pecasComConteudo,
                documentosDaBiblioteca
            },
            produto: slugify(prompt.name),
            promptSlug: slugify(prompt.name),
            internalPrompt: definition,
            title: prompt.name,
            plugins: []
        }
        requestArray.push(req)

        // Basic chat as last item
        if (!prompt?.name?.toLowerCase().startsWith('chat ')) {
            const definition2 = await getPromptDefinition(`chat`)
            const data: PromptDataType = { numeroDoProcesso, textos: pecasComConteudo, documentosDaBiblioteca }
            requestArray.push({ documentCode: null, documentDescr: null, data, title: 'Chat', produto: 'chat', promptSlug: definition2.kind, internalPrompt: definition2 })
        }
    }

    return requestArray
}
