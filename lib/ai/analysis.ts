import { getInternalPrompt, getPiecesWithContent } from '@/lib/ai/prompt'
import { GeneratedContent, PromptDataType, PromptDefinitionType, TextoType } from '@/lib/ai/prompt-types'
import { CargaDeConteudoEnum, obterDadosDoProcesso } from '@/lib/proc/process'
import { assertCurrentUser } from '@/lib/user'
import { T, P, ProdutosValidos, Plugin, ProdutoCompleto, InfoDeProduto } from '@/lib/proc/combinacoes'
import { slugify } from '@/lib/utils/utils'
import { IAGenerated } from '@/lib/db/mysql-types'
import { Dao } from '@/lib/db/mysql'
import { getTriagem, getNormas, getPalavrasChave } from '@/lib/fix'
import { generateContent } from '@/lib/ai/generate'
import { infoDeProduto } from '../proc/info-de-produto'
import { envString } from '../utils/env'
import { DadosDoProcessoType } from '../proc/process-types'
import { buildFooter } from '../utils/footer'
import { clipPieces } from './clip-pieces'

export async function summarize(dossierNumber: string, pieceNumber: string): Promise<{ dossierData: any, generatedContent: GeneratedContent }> {
    const pUser = assertCurrentUser()

    // Obter peças
    const pDadosDoProcesso = obterDadosDoProcesso({ numeroDoProcesso: dossierNumber, pUser, idDaPeca: pieceNumber })
    const dadosDoProcesso: DadosDoProcessoType = await pDadosDoProcesso
    if (dadosDoProcesso.errorMsg) throw new Error(dadosDoProcesso.errorMsg)

    // Obter conteúdo das peças
    const pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dossierNumber)
    const peca = pecasComConteudo[0]

    const definition: PromptDefinitionType = getInternalPrompt(`resumo-${peca.slug}`)

    const data: PromptDataType = { textos: [{ descr: peca.descr, slug: peca.slug, pTexto: peca.pTexto, sigilo: peca.sigilo }] }
    const infoDeProduto: InfoDeProduto = { produto: P.RESUMO_PECA, titulo: peca.descr, dados: [peca.descr as T], prompt: definition.kind, plugins: [] }
    const req: GeneratedContent = {
        documentCode: peca.id || null, documentDescr: peca.descr, data, title: peca.descr, produto: infoDeProduto.produto, promptSlug: definition.kind, internalPrompt: definition
    }

    // Retrieve from cache or generate
    req.result = generateContent(definition, data)
    const result = await req.result as IAGenerated
    req.generated = result.generation
    req.id = result.id

    return { dossierData: dadosDoProcesso, generatedContent: req }
}

export function buildRequests(dossierNumber: string, produtos: InfoDeProduto[], pecasComConteudo: TextoType[]): GeneratedContent[] {
    const requests: GeneratedContent[] = []

    // Add product IARequests
    for (const produto of produtos) {
        let data: PromptDataType = { numeroDoProcesso: dossierNumber, textos: pecasComConteudo }

        let produtoSimples: P | undefined = undefined
        // if produto is complex filter data.textos
        if (typeof produto === 'object') {
            const complex = produto as any as ProdutoCompleto
            const tipos = Array.isArray(complex.dados) ? complex.dados : [complex.dados]
            if (tipos.length !== 0)
                data.textos = data.textos.filter(peca => tipos.includes(peca.descr as T))
            produtoSimples = complex.produto
        } else {
            produtoSimples = produto
        }

        // Add resume for each piece
        if (produtoSimples === P.RESUMOS) {
            for (const peca of data.textos) {
                const definition = getInternalPrompt(`resumo-${peca.slug}`)
                const data: PromptDataType = { textos: [peca] }
                requests.push({ documentCode: peca.id || null, documentDescr: peca.descr, documentLocation: peca.event, documentLink: `/api/v1/process/${dossierNumber}/piece/${peca.id}/binary`, data, title: peca.descr, produto: produto.produto, promptSlug: definition.kind, internalPrompt: definition })
            }
            continue
        }

        const produtoValido = ProdutosValidos[produtoSimples]

        const definition = getInternalPrompt(produtoValido.prompt)
        if (!definition) continue

        // const infoDeProduto = { ...produto }

        requests.push({ documentCode: null, documentDescr: null, data, produto: produtoSimples, promptSlug: definition.kind, internalPrompt: definition, title: produtoValido.titulo, plugins: produtoValido.plugins })
    }
    return requests
}

export async function analyze(batchName: string | undefined, dossierNumber: string, kind: string | undefined, complete: boolean): Promise<{ dossierData: any, generatedContent: GeneratedContent[] }> {
    console.log('analyze', batchName, dossierNumber)
    try {
        const pUser = assertCurrentUser()

        // Obter peças
        const pDadosDoProcesso = obterDadosDoProcesso({ numeroDoProcesso: dossierNumber, pUser, completo: complete, kind, conteudoDasPecasSelecionadas: CargaDeConteudoEnum.SINCRONO })
        const dadosDoProcesso = await pDadosDoProcesso
        if (dadosDoProcesso.errorMsg) throw new Error(dadosDoProcesso.errorMsg)
        if (!dadosDoProcesso?.tipoDeSintese) throw new Error(`${dossierNumber}: Nenhum tipo de síntese válido`)
        const produtos = dadosDoProcesso?.produtos

        let pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dossierNumber, true)

        if (complete) {
            // Limita aos primeiros N documentos, para não ficar muito caro nos testes
            if (envString('COMPLETE_ANALYSIS_LIMIT'))
                pecasComConteudo = pecasComConteudo.slice(0, parseInt(envString('COMPLETE_ANALYSIS_LIMIT') as string))
        }

        // console.log('pecasComConteudo', pecasComConteudo)

        const requests: GeneratedContent[] = buildRequests(dossierNumber, produtos.filter(p => p !== P.CHAT).map(p => infoDeProduto(p)), pecasComConteudo)

        // Retrieve from cache or generate
        for (const req of requests) {
            req.result = generateContent(getInternalPrompt(req.promptSlug), req.data)
        }

        let model: string | undefined = undefined
        for (const req of requests) {
            const result = await req.result as IAGenerated
            if (!model) model = result.model
            req.generated = result.generation
            req.id = result.id
            if (!req.generated || !req.id) {
                console.error('Error generating content')
                throw new Error('Error generating content')
            }
        }

        if (batchName) {
            const user = await pUser
            const systemCode = user?.image?.system || 'PDPJ'
            const systemId = await Dao.assertSystemId(systemCode)
            const textosParaClipagem = JSON.parse(JSON.stringify(pecasComConteudo))
            const textosClipados = clipPieces(model, textosParaClipagem)
            const footer = buildFooter(model || '-', textosClipados)
            storeBatchItem(systemId, batchName, dossierNumber, requests, dadosDoProcesso, footer)
        }

        return { dossierData: dadosDoProcesso, generatedContent: requests }
    } catch (error) {
        console.error('Error processing batch', error)
        throw error
    }
}


// Insert into database as part of a batch
async function storeBatchItem(systemId: number, batchName: string, dossierNumber: string, requests: GeneratedContent[], dadosDoProcesso: any, footer: string) {
    const batch_id = await Dao.assertIABatchId(batchName)
    const dossier_id = await Dao.assertIADossierId(dossierNumber, systemId, dadosDoProcesso.codigoDaClasse, dadosDoProcesso.ajuizamento)
    await Dao.deleteIABatchDossierId(batch_id, dossier_id)
    const batch_dossier_id = await Dao.assertIABatchDossierId(batch_id, dossier_id, footer)
    let seq = 0
    for (const req of requests) {
        const document_id = req.documentCode ? await Dao.assertIADocumentId(dossier_id, req.documentCode, req.documentDescr) : null
        await Dao.insertIABatchDossierItem({ batch_dossier_id, document_id, generation_id: req.id as number, descr: req.title, seq })
        seq++

        // process plugins
        if (!req.plugins || !req.plugins.length) continue
        for (const plugin of req.plugins) {
            switch (plugin) {
                case Plugin.TRIAGEM: {
                    const triage = getTriagem(req.generated)
                    const enum_id = await Dao.assertIAEnumId(Plugin.TRIAGEM)
                    const enum_item_id = await Dao.assertIAEnumItemId(triage, enum_id)
                    await Dao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                    break
                }
                case Plugin.TRIAGEM_JSON: {
                    if (req.generated) {
                        const triage = JSON.parse(req.generated).triagem
                        if (triage) {
                            const enum_id = await Dao.assertIAEnumId(Plugin.TRIAGEM)
                            const enum_item_id = await Dao.assertIAEnumItemId(triage, enum_id)
                            await Dao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                            break
                        }
                    }
                }
                case Plugin.NORMAS: {
                    const normas = getNormas(req.generated)
                    const enum_id = await Dao.assertIAEnumId(Plugin.NORMAS)
                    for (const norma of normas) {
                        const enum_item_id = await Dao.assertIAEnumItemId(norma, enum_id)
                        await Dao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                    }
                    break
                }
                case Plugin.NORMAS_JSON: {
                    if (req.generated) {
                        const normas = JSON.parse(req.generated).normas
                        if (normas) {
                            const enum_id = await Dao.assertIAEnumId(Plugin.NORMAS)
                            for (const norma of normas) {
                                const enum_item_id = await Dao.assertIAEnumItemId(norma, enum_id)
                                await Dao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                            }
                            break
                        }
                    }
                }
                case Plugin.PALAVRAS_CHAVE: {
                    const palavrasChave = getPalavrasChave(req.generated)
                    const enum_id = await Dao.assertIAEnumId(Plugin.PALAVRAS_CHAVE)
                    for (const palavraChave of palavrasChave) {
                        const enum_item_id = await Dao.assertIAEnumItemId(palavraChave, enum_id)
                        await Dao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                    }
                    break
                }
                case Plugin.PALAVRAS_CHAVE_JSON: {
                    if (req.generated) {
                        const palavrasChave = JSON.parse(req.generated).palavrasChave
                        if (palavrasChave) {
                            const enum_id = await Dao.assertIAEnumId(Plugin.PALAVRAS_CHAVE)
                            for (const palavraChave of palavrasChave) {
                                const enum_item_id = await Dao.assertIAEnumItemId(palavraChave, enum_id)
                                await Dao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                            }
                            break
                        }
                    }
                }
            }
        }
    }
}