import { getPiecesWithContent } from '@/lib/ai/prompt'
import { getPromptDefinition, getAggregatorByKind } from '@/lib/ai/prompt-store'
import { GeneratedContent, PromptDataType, PromptDefinitionType, TextoType } from '@/lib/ai/prompt-types'
import { CargaDeConteudoEnum, obterDadosDoProcesso } from '@/lib/proc/process'
import { assertCurrentUser } from '@/lib/user'
import { T, Plugin, PieceStrategy, selecionarPecasPorPadraoComFase } from '@/lib/proc/combinacoes'
import { IAGenerated, IAPrompt } from '@/lib/db/mysql-types'
import { PromptDao, SystemDao, BatchDao, DossierDao, DocumentDao, EnumDao } from '@/lib/db/dao'
import { getTriagem, getNormas, getPalavrasChave } from '@/lib/fix'
import { generateContent } from '@/lib/ai/generate'
import { DadosDoProcessoType, identificarSituacaoDaPeca } from '../proc/process-types'
import { buildFooter } from '../utils/footer'
import { clipPieces } from './clip-pieces'
import { buildRequests } from './build-requests'
import devLog from '../utils/log'
import { getTools } from '../ai-tools/tools'

export async function summarize(dossierNumber: string, pieceNumber: string): Promise<{ dossierData: any, generatedContent: GeneratedContent }> {
    const pUser = assertCurrentUser()

    // Obter peças
    const pDadosDoProcesso = obterDadosDoProcesso({ numeroDoProcesso: dossierNumber, pUser, idDaPeca: pieceNumber })
    const dadosDoProcesso: DadosDoProcessoType = await pDadosDoProcesso
    if (dadosDoProcesso.errorMsg) throw new Error(dadosDoProcesso.errorMsg)

    // Obter conteúdo das peças
    const pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dossierNumber)
    const peca = pecasComConteudo[0]

    const definition: PromptDefinitionType = await getPromptDefinition(`resumo-${peca.slug}`)

    const data: PromptDataType = { textos: [{ numeroDoProcesso: peca.numeroDoProcesso, descr: peca.descr, slug: peca.slug, pTexto: peca.pTexto, sigilo: peca.sigilo }] }
    const req: GeneratedContent = {
        documentCode: peca.id || null, documentDescr: peca.descr, data, title: peca.descr, produto: definition.kind, promptSlug: definition.kind, internalPrompt: definition
    }

    // Retrieve from cache or generate
    req.result = generateContent(definition, data, getTools(pUser))
    const result = await req.result as IAGenerated
    req.generated = result.generation
    req.id = result.id

    return { dossierData: dadosDoProcesso, generatedContent: req }
}

export async function analyze(batchName: string | undefined, dossierNumber: string, kind: number, complete: boolean): Promise<{ dossierData: any, generatedContent: GeneratedContent[] }> {
    devLog('analyze', batchName, dossierNumber)
    try {
        const pUser = assertCurrentUser()

        let dadosDoProcesso: DadosDoProcessoType = await obterDadosDoProcesso({ numeroDoProcesso: dossierNumber, pUser, completo: complete, kind: undefined, conteudoDasPecasSelecionadas: CargaDeConteudoEnum.NAO })
        if (dadosDoProcesso.errorMsg) throw new Error(dadosDoProcesso.errorMsg)
        // if (!dadosDoProcesso?.tipoDeSintese) throw new Error(`${dossierNumber}: Nenhum tipo de síntese válido`)
        let promptFromDB: IAPrompt | null = null

        const promptId = Number(kind)

        // Obter prompt (e versão mais recente, se aplicável)
        promptFromDB = await PromptDao.retrievePromptById(promptId)
        if (promptFromDB?.base_id && !promptFromDB?.is_latest) {
            promptFromDB = await PromptDao.retrieveLatestPromptByBaseId(promptFromDB.base_id)
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
                    const selecao = selecionarPecasPorPadraoComFase(allPieces, strategy.pattern, dadosDoProcesso.movimentosEDocumentos)
                    if (selecao?.pecas?.length) selectedIds = selecao.pecas.map(p => p.id)
                } else if (key === 'TIPOS_ESPECIFICOS' && pieceDescr?.length) {
                    const pieceDescrValues = pieceDescr.map(d => T[d])
                    selectedIds = allPieces.filter(p => pieceDescrValues.includes(p.descr)).map(p => p.id)
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

        let pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dossierNumber, true)

        if (pecasComConteudo.length === 0) throw new Error(`${dossierNumber}: Nenhuma peça com conteúdo`)

        // Telemetria: tamanho das peças carregadas (texto + binário) antes do clip.
        // {
        //     let totalTextoChars = 0
        //     let maiorPecaChars = 0
        //     let totalBinarioBytes = 0
        //     let maiorBinarioBytes = 0
        //     for (const p of pecasComConteudo) {
        //         const t = p.texto?.length || 0
        //         // Conteúdo binário (PDF/imagem/áudio) vem como data URL base64 dentro de texto.
        //         if (p.texto?.startsWith('data:')) {
        //             totalBinarioBytes += t
        //             if (t > maiorBinarioBytes) maiorBinarioBytes = t
        //         } else {
        //             totalTextoChars += t
        //             if (t > maiorPecaChars) maiorPecaChars = t
        //         }
        //     }
        //     logPiecesEvent('analyze:pre-clip', {
        //         processo: dossierNumber,
        //         batch: batchName || '',
        //         complete: complete ? 1 : 0,
        //         n_pecas: pecasComConteudo.length,
        //         total_texto_chars: totalTextoChars,
        //         maior_peca_chars: maiorPecaChars,
        //         total_binario_bytes: totalBinarioBytes,
        //         maior_binario_bytes: maiorBinarioBytes,
        //     })
        // }

        if (!pecasComConteudo.find(p => !identificarSituacaoDaPeca(p.texto).problematica))
            throw new Error(`${dossierNumber}: Todas as peças estão com problemas (sigilosas, inacessíveis, vazias ou parciais)`)

        let requests: GeneratedContent[]
        requests = (await buildRequests(promptFromDB, undefined, dossierNumber, dadosDoProcesso.pecasSelecionadas)).filter(r => r && r.promptSlug !== 'chat')

        // Auto-detect plugins from prompt content markers
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


        // Retrieve from cache or generate
        const execution_id = crypto.randomUUID()
        const aggregatorId = promptFromDB?.id ?? null
        const tools = await getTools(pUser)
        for (const req of requests) {
            const isAggregator = req.internalPrompt?.dbId === aggregatorId
            const additionalInformation = {
                execution_id,
                aggregator_prompt_id: isAggregator ? null : aggregatorId,
            }
            req.result = generateContent(req.internalPrompt, req.data, tools, additionalInformation)
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
            const systemCode = user?.system || 'PDPJ'
            const systemId = await SystemDao.assertSystemId(systemCode)
            const textosParaClipagem = JSON.parse(JSON.stringify(pecasComConteudo))
            const textosClipados = await clipPieces(model, textosParaClipagem)
            // Telemetria: tamanho após clip (confirma se o clip atuou).
            // const totalPosClip = textosClipados.reduce((s, p) => s + (p.texto?.startsWith('data:') ? 0 : p.texto?.length || 0), 0)
            // logPiecesEvent('analyze:post-clip', {
            //     processo: dossierNumber,
            //     model: model || '',
            //     n_pecas: textosClipados.length,
            //     total_pos_clip_chars: totalPosClip,
            //     n_requests: requests.length,
            // })
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
    const batch_id = await BatchDao.assertIABatchId(batchName)
    const dossier_id = await DossierDao.assertIADossierId(dossierNumber, systemId, dadosDoProcesso.codigoDaClasse, dadosDoProcesso.ajuizamento)
    await BatchDao.deleteIABatchDossierId(batch_id, dossier_id)
    const batch_dossier_id = await BatchDao.assertIABatchDossierId(batch_id, dossier_id, footer)
    let seq = 0
    for (const req of requests) {
        const document_id = req.documentCode ? await DocumentDao.assertIADocumentId(dossier_id, req.documentCode, req.documentDescr) : null
        await BatchDao.insertIABatchDossierItem({ batch_dossier_id, document_id, generation_id: req.id as number, descr: req.title, seq })
        seq++

        // process plugins
        if (!req.plugins || !req.plugins.length) continue
        for (const plugin of req.plugins) {
            switch (plugin) {
                case Plugin.TRIAGEM: {
                    const triage = getTriagem(req.generated)
                    if (!triage) throw new Error('Triagem não encontrada')
                    const enum_id = await EnumDao.assertIAEnumId(Plugin.TRIAGEM)
                    const enum_item_id = await EnumDao.assertIAEnumItemId(triage, enum_id)
                    await BatchDao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                    break
                }
                case Plugin.TRIAGEM_JSON: {
                    if (req.generated) {
                        const triage = JSON.parse(req.generated).triagem
                        if (triage) {
                            const enum_id = await EnumDao.assertIAEnumId(Plugin.TRIAGEM)
                            const enum_item_id = await EnumDao.assertIAEnumItemId(triage, enum_id)
                            await BatchDao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                            break
                        } else {
                            throw new Error('Triagem não encontrada')
                        }
                    }
                }
                case Plugin.NORMAS: {
                    const normas = getNormas(req.generated)
                    const enum_id = await EnumDao.assertIAEnumId(Plugin.NORMAS)
                    for (const norma of normas) {
                        const enum_item_id = await EnumDao.assertIAEnumItemId(norma, enum_id)
                        await BatchDao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                    }
                    break
                }
                case Plugin.NORMAS_JSON: {
                    if (req.generated) {
                        const normas = JSON.parse(req.generated).normas
                        if (normas) {
                            const enum_id = await EnumDao.assertIAEnumId(Plugin.NORMAS)
                            for (const norma of normas) {
                                const enum_item_id = await EnumDao.assertIAEnumItemId(norma, enum_id)
                                await BatchDao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                            }
                            break
                        }
                    }
                }
                case Plugin.PALAVRAS_CHAVE: {
                    const palavrasChave = getPalavrasChave(req.generated)
                    const enum_id = await EnumDao.assertIAEnumId(Plugin.PALAVRAS_CHAVE)
                    for (const palavraChave of palavrasChave) {
                        const enum_item_id = await EnumDao.assertIAEnumItemId(palavraChave, enum_id)
                        await BatchDao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                    }
                    break
                }
                case Plugin.PALAVRAS_CHAVE_JSON: {
                    if (req.generated) {
                        const palavrasChave = JSON.parse(req.generated).palavrasChave
                        if (palavrasChave) {
                            const enum_id = await EnumDao.assertIAEnumId(Plugin.PALAVRAS_CHAVE)
                            for (const palavraChave of palavrasChave) {
                                const enum_item_id = await EnumDao.assertIAEnumItemId(palavraChave, enum_id)
                                await BatchDao.assertIABatchDossierEnumItemId(batch_dossier_id, enum_item_id)
                            }
                            break
                        }
                    }
                }
            }
        }
    }
}