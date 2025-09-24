import { IAPrompt } from "../db/mysql-types"
import { InfoDeProduto, P, TipoDeSinteseMap } from "../proc/combinacoes"
import { infoDeProduto } from "../proc/info-de-produto"
import { PecaType } from "../proc/process-types"
import { slugify } from "../utils/utils"
import { getInternalPrompt } from "./prompt"
import { GeneratedContent, PromptDataType, PromptDefinitionType, TextoType } from "./prompt-types"

export const buildRequests = (prompt: IAPrompt, numeroDoProcesso: string, selectedPieces: PecaType[], contents: { [key: number]: string }): GeneratedContent[] => {
    const requestArray: GeneratedContent[] = []
    const pecasComConteudo: TextoType[] = selectedPieces.map(peca => ({ id: peca.id, numeroDoProcesso: peca.numeroDoProcesso, event: peca.numeroDoEvento, idOrigem: peca.idOrigem, label: peca.rotulo, descr: peca.descr, slug: slugify(peca.descr), texto: peca.conteudo || contents[peca.id], sigilo: peca.sigilo }))
    let produtos: InfoDeProduto[] = []
    // Internal seeded prompt: use map products
    if (prompt.kind?.startsWith('^')) {
        const key = prompt.kind.substring(1)
        const def = TipoDeSinteseMap[key]
        if (def) {
            produtos = def.produtos.map(p => infoDeProduto(p))
        }
        // If products list is defined via TipoDeSinteseMap, append them (avoids double-adding chat if not desired later)
        for (const ip of produtos) {
            if (ip.produto === P.RESUMOS) {
                // Add resume for each piece
                for (const peca of pecasComConteudo) {
                    const definition = getInternalPrompt(`resumo-${peca.slug}`)
                    const data: PromptDataType = { textos: [peca] }
                    requestArray.push({ documentCode: peca.id || null, documentDescr: peca.descr, documentLocation: peca.event, documentLink: `/api/v1/process/${peca.numeroDoProcesso || numeroDoProcesso}/piece/${peca.id}/binary`, data, title: peca.descr, produto: ip.produto, promptSlug: definition.kind, internalPrompt: definition })
                }
                continue
            }
            const def = getInternalPrompt(ip.prompt)
            if (!def) continue
            const data: PromptDataType = { numeroDoProcesso, textos: pecasComConteudo }
            requestArray.push({ documentCode: null, documentDescr: null, data, title: ip.titulo, produto: ip.produto, promptSlug: def.kind, internalPrompt: def })
        }
    } else {
        if (prompt.content.summary === 'SIM') {
            for (const peca of pecasComConteudo) {
                const definition = getInternalPrompt(`resumo-${peca.slug}`)
                const data: PromptDataType = {
                    numeroDoProcesso,
                    textos: [peca]
                }
                requestArray.push({ documentCode: peca.id || null, documentDescr: peca.descr, documentLocation: peca.event, documentLink: `/api/v1/process/${peca.numeroDoProcesso || numeroDoProcesso}/piece/${peca.id}/binary`, data, title: peca.descr, produto: P.RESUMO_PECA, promptSlug: definition.kind, internalPrompt: definition })
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
        }
        const req: GeneratedContent = {
            documentCode: null,
            documentDescr: null,
            data: {
                numeroDoProcesso,
                textos: pecasComConteudo
            },
            produto: P.RESUMO,
            promptSlug: slugify(prompt.name),
            internalPrompt: definition,
            title: prompt.name,
            plugins: []
        }
        requestArray.push(req)

        // Basic chat as last item
        const definition2 = getInternalPrompt(`chat`)
        const data: PromptDataType = { textos: pecasComConteudo }
        requestArray.push({ documentCode: null, documentDescr: null, data, title: 'Chat', produto: P.CHAT, promptSlug: definition2.kind, internalPrompt: definition2 })
    }

    return requestArray
}
