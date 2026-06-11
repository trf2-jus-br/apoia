import { getPiecesWithContent } from '@/lib/ai/prompt'
import { getPromptDefinition } from '@/lib/ai/prompt-store'
import { GeneratedContent, PromptDataType, PromptDefinitionType } from '@/lib/ai/prompt-types'
import { CargaDeConteudoEnum, obterDadosDoProcesso } from '@/lib/proc/process'
import { assertCurrentUser } from '@/lib/user'
import { T, PieceStrategy, selecionarPecasPorPadraoComFase } from '@/lib/proc/combinacoes'
import { IAGenerated, IAPrompt } from '@/lib/db/mysql-types'
import { PromptDao, SystemDao, BatchDao, DossierDao, DocumentDao } from '@/lib/db/dao'
import { generateContent } from '@/lib/ai/generate'
import { DadosDoProcessoType, identificarSituacaoDaPeca } from '../proc/process-types'
import { buildFooter } from '../utils/footer'
import { clipPieces } from './clip-pieces'
import devLog from '../utils/log'
import { getTools } from './tools'
import { WorkflowEngine } from './workflow-engine'
import { processPlugins } from './plugins'

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

        let promptFromDB: IAPrompt | null = null
        const promptId = Number(kind)

        // Obter prompt (e versão mais recente, se aplicável)
        promptFromDB = await PromptDao.retrievePromptById(promptId)
        if (promptFromDB?.base_id && !promptFromDB?.is_latest) {
            promptFromDB = await PromptDao.retrieveLatestPromptByBaseId(promptFromDB.base_id)
        }
        if (!promptFromDB) throw new Error('Prompt não encontrado')

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
            // Preserva metadados da primeira chamada e substitui as peças carregadas
            dadosDoProcesso = { ...dadosDoProcesso, pecasSelecionadas: dadosComPecasSelecionados.pecasSelecionadas }
        }

        let pecasComConteudo = await getPiecesWithContent(dadosDoProcesso, dossierNumber, true)

        if (pecasComConteudo.length === 0) throw new Error(`${dossierNumber}: Nenhuma peça com conteúdo`)

        if (!pecasComConteudo.find(p => !identificarSituacaoDaPeca(p.texto).problematica))
            throw new Error(`${dossierNumber}: Todas as peças estão com problemas (sigilosas, inacessíveis, vazias ou parciais)`)

        // Workflow execution
        const engine = new WorkflowEngine(await pUser)
        const executionResults = await engine.execute(promptFromDB, {
            numeroDoProcesso: dossierNumber,
            textos: pecasComConteudo
        })

        // Filter out chat results from the list returned to the main process view
        const requests = executionResults
            .map(r => r.content)
            .filter(c => c.promptSlug !== 'chat' && c.promptSlug !== 'chat-standalone')

        if (batchName) {
            const user = await pUser
            const systemCode = user?.system || 'PDPJ'
            const systemId = await SystemDao.assertSystemId(systemCode)

            let model: string | undefined = undefined
            if (executionResults.length > 0) model = executionResults[0].generated.model

            const textosParaClipagem = JSON.parse(JSON.stringify(pecasComConteudo))
            const textosClipados = await clipPieces(model, textosParaClipagem)
            const footer = buildFooter(model || '-', textosClipados)
            storeBatchItem(systemId, batchName, dossierNumber, requests, dadosDoProcesso, footer, engine.getExecutionId())
        }

        return { dossierData: dadosDoProcesso, generatedContent: requests }
    } catch (error) {
        console.error('Error processing batch', error)
        throw error
    }
}


// Insert into database as part of a batch
async function storeBatchItem(systemId: number, batchName: string, dossierNumber: string, requests: GeneratedContent[], dadosDoProcesso: any, footer: string, executionId?: string) {
    const batch_id = await BatchDao.assertIABatchId(batchName)
    const dossier_id = await DossierDao.assertIADossierId(dossierNumber, systemId, dadosDoProcesso.codigoDaClasse, dadosDoProcesso.ajuizamento)
    await BatchDao.deleteIABatchDossierId(batch_id, dossier_id)
    const batch_dossier_id = await BatchDao.assertIABatchDossierId(batch_id, dossier_id, footer)
    let seq = 0
    for (const req of requests) {
        const document_id = req.documentCode ? await DocumentDao.assertIADocumentId(dossier_id, req.documentCode, req.documentDescr) : null
        await BatchDao.insertIABatchDossierItem({ batch_dossier_id, document_id, generation_id: req.id as number, descr: req.title, seq })
        seq++

        // process plugins using the decoupled system
        if (req.plugins && req.plugins.length > 0 && req.generated) {
            await processPlugins(req.plugins, req.generated, {
                execution_id: executionId,
                batch_dossier_id,
                document_id
            });
        }
    }
}