import { getInternalPrompt, getPiecesWithContent } from '@/lib/ai/prompt'
import { GeneratedContent, PromptDataType, PromptDefinitionType, TextoType } from '@/lib/ai/prompt-types'
import { CargaDeConteudoEnum, obterDadosDoProcesso } from '@/lib/proc/process'
import { assertCurrentUser } from '@/lib/user'
import { T, P, ProdutosValidos, Plugin, ProdutoCompleto, InfoDeProduto, PieceStrategy, selecionarPecasPorPadraoComFase } from '@/lib/proc/combinacoes'
import { slugify } from '@/lib/utils/utils'
import { IAGenerated, IAPrompt } from '@/lib/db/mysql-types'
import { Dao } from '@/lib/db/mysql'
import { getTriagem, getNormas, getPalavrasChave } from '@/lib/fix'
import { generateContent } from '@/lib/ai/generate'
import { infoDeProduto } from '../proc/info-de-produto'
import { envString } from '../utils/env'
import { DadosDoProcessoType } from '../proc/process-types'
import { buildFooter } from '../utils/footer'
import { clipPieces } from './clip-pieces'
import { th } from 'zod/v4/locales'
import { nivelDeSigiloPermitido } from '../proc/sigilo'
import { buildRequests } from './build-requests'

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

    const data: PromptDataType = { textos: [{ numeroDoProcesso: peca.numeroDoProcesso, descr: peca.descr, slug: peca.slug, pTexto: peca.pTexto, sigilo: peca.sigilo }] }
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

export function buildRequestsForAnalysis(dossierNumber: string, produtos: InfoDeProduto[], pecasComConteudo: TextoType[]): GeneratedContent[] {
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

export async function analyze(batchName: string | undefined, dossierNumber: string, kind: string | number | undefined, complete: boolean): Promise<{ dossierData: any, generatedContent: GeneratedContent[] }> {
    console.log('analyze', batchName, dossierNumber)
    try {
        const pUser = assertCurrentUser()

        // Obter peças (fase 1)
        // Se kind for numérico (id de prompt no banco), carregamos dados do processo SEM conteúdo para podermos
        // selecionar as peças conforme a estratégia definida no prompt do banco.
        const isNumericKind = typeof kind === 'number' || (typeof kind === 'string' && /^\d+$/.test(kind))
        const internalKind = isNumericKind ? undefined : (kind as any)

        let dadosDoProcesso: DadosDoProcessoType = await obterDadosDoProcesso({ numeroDoProcesso: dossierNumber, pUser, completo: complete, kind: internalKind, conteudoDasPecasSelecionadas: (isNumericKind && !complete) ? CargaDeConteudoEnum.NAO : CargaDeConteudoEnum.SINCRONO })
        if (dadosDoProcesso.errorMsg) throw new Error(dadosDoProcesso.errorMsg)
        if (!dadosDoProcesso?.tipoDeSintese) throw new Error(`${dossierNumber}: Nenhum tipo de síntese válido`)
        const produtos = dadosDoProcesso?.produtos
        let promptFromDB: IAPrompt | null = null

        // Seleção de peças baseada no prompt do banco
        if (isNumericKind) {
            const promptId = Number(kind)

            // Obter prompt (e versão mais recente, se aplicável)
            promptFromDB = await Dao.retrievePromptById(promptId)
            if (promptFromDB?.base_id && !promptFromDB?.is_latest) {
                promptFromDB = await Dao.retrieveLatestPromptByBaseId(promptFromDB.base_id)
            }

            // Se o prompt atuar sobre PROCESSO e tiver estratégia de peças, aplica seleção e recarrega conteúdo
            const target = promptFromDB?.content?.target
            const pieceStrategy = promptFromDB?.content?.piece_strategy
            const pieceDescr = promptFromDB?.content?.piece_descr as string[] | undefined
            if (!complete && target === 'PROCESSO' && (pieceStrategy)) {
                const allPieces = (dadosDoProcesso as any).pecas || []
                let selectedIds: string[] = []
                if (pieceStrategy) {
                    const key = pieceStrategy.toString().trim().toUpperCase().replace(/-/g, '_')
                    const strategy = (PieceStrategy as any)[key]
                    if (strategy?.pattern) {
                        const selecao = selecionarPecasPorPadraoComFase(allPieces, strategy.pattern)
                        if (selecao?.pecas?.length) selectedIds = selecao.pecas.map(p => p.id)
                    } else if (key === 'TIPOS_ESPECIFICOS' && pieceDescr?.length) {
                        // Seleciona todas as peças dos tipos especificados
                        selectedIds = allPieces.filter(p => pieceDescr.includes(p.descr as any)).map(p => p.id)
                    } else {
                        throw new Error(`Estratégia de peça inválida: ${pieceStrategy}`)
                    }
                }

                // Carrega novamente os dados do processo APENAS com as peças selecionadas e com conteúdo síncrono
                const dadosComPecasSelecionados = await obterDadosDoProcesso({ numeroDoProcesso: dossierNumber, pUser, pieces: selectedIds, conteudoDasPecasSelecionadas: CargaDeConteudoEnum.SINCRONO })
                if (dadosComPecasSelecionados.errorMsg) throw new Error(dadosComPecasSelecionados.errorMsg)
                // Preserva metadados (tipoDeSintese, produtos) da primeira chamada e substitui as peças carregadas
                dadosDoProcesso = { ...dadosDoProcesso, pecasSelecionadas: dadosComPecasSelecionados.pecasSelecionadas }
            }
        }

        let pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dossierNumber, true)

        if (pecasComConteudo.length === 0) throw new Error(`${dossierNumber}: Nenhuma peça com conteúdo`)

        // console.log('pecasComConteudo', pecasComConteudo)

        let requests: GeneratedContent[]
        if (isNumericKind) {
            requests = buildRequests(promptFromDB, dossierNumber, dadosDoProcesso.pecasSelecionadas, undefined).filter(r => r && r.promptSlug !== 'chat')
            
            // Acrescenta o Plugins conforme o conteúdo do prompt
            for (const req of requests) {
                if (!req.plugins) req.plugins = []
                if (req.internalPrompt?.prompt?.includes('# Triagem')) {
                    if (!req.plugins.includes(Plugin.TRIAGEM)) req.plugins.push(Plugin.TRIAGEM)
                }
                if (req.internalPrompt?.prompt?.includes('# Normas/Jurisprudência Invocadas')) {
                    if (!req.plugins.includes(Plugin.NORMAS)) req.plugins.push(Plugin.NORMAS)
                }
                if (req.internalPrompt?.prompt?.includes('# Palavras-Chave')) {
                    if (!req.plugins.includes(Plugin.PALAVRAS_CHAVE)) req.plugins.push(Plugin.PALAVRAS_CHAVE)
                }
            }
        } else {
            requests = buildRequestsForAnalysis(dossierNumber, produtos.filter(p => p !== P.CHAT).map(p => infoDeProduto(p)), pecasComConteudo)
        }


        // Retrieve from cache or generate
        for (const req of requests) {
            req.result = generateContent(req.internalPrompt, req.data)
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
                    if (!triage) throw new Error('Triagem não encontrada')
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
                        } else {
                            throw new Error('Triagem não encontrada')
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