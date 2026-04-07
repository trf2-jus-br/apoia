import 'server-only'

import { decrypt } from '../utils/crypt'
import { SystemDao, DossierDao, DocumentDao } from '../db/dao'
import { inferirCategoriaDaPeca } from '../category'
import { obterConteudoDaPeca, obterDocumentoGravado } from './piece'
import { isNivelDeSigiloPermitido } from './sigilo'
import { selecionarPecasPorPadraoComFase, T, PieceStrategy, SelecionarPecasResultado } from './combinacoes'
import { getTiposDeSinteseValido } from './info-de-produto'
import { getInterop, Interop } from '../interop/interop'
import { DadosDoProcessoType, PecaType, TEXTO_PECA_COM_ERRO, TEXTO_PECA_SIGILOSA } from './process-types'
import { UserType } from '../user'
import devLog from '../utils/log'
import * as Sentry from '@sentry/nextjs'
import { getAggregatorByKind } from '../ai/prompt-store'

const selecionarPecas = (pecas: PecaType[], descricoes: string[]) => {
    const pecasRelevantes = pecas.filter(p => descricoes.includes(p.descr))

    // Seleciona as peças de acordo com o tipo de peça, pegando sempre a primeira peça de cada tipo
    let pecasSelecionadas: PecaType[] = []
    let idxDescricao = 0

    for (const peca of pecasRelevantes) {
        if (peca.descr === descricoes[idxDescricao]) {
            pecasSelecionadas.push(peca)
            idxDescricao++
            if (idxDescricao >= descricoes.length) break
        }
    }
    if (pecasSelecionadas.length !== descricoes.length)
        return null
    return pecasSelecionadas
}

export const selecionarUltimasPecas = (pecas: PecaType[], descricoes: string[]) => {
    const pecasRelevantes = pecas.filter(p => descricoes.includes(p.descr))

    // Seleciona as peças de acordo com o tipo de peça, pegando sempre a última peça de cada tipo
    let pecasSelecionadas: PecaType[] = []
    let idxDescricao = descricoes.length - 1

    for (const peca of pecasRelevantes.reverse()) {
        if (peca.descr === descricoes[idxDescricao]) {
            pecasSelecionadas = [peca, ...pecasSelecionadas]
            idxDescricao--
            if (idxDescricao < 0) break
        }
    }
    if (pecasSelecionadas.length !== descricoes.length)
        return null
    return pecasSelecionadas
}



const iniciarObtencaoDeConteudo = async (dossier_ids: { [key: string]: number }, numeroDoProcesso: string, pecas: PecaType[], interop: Interop, synchronous?: boolean) => {
    for (const peca of pecas) {
        if (peca.conteudo) continue
        const np = peca.numeroDoProcesso || numeroDoProcesso
        if (!dossier_ids[np]) throw new Error(`Dossier_id não encontrado para o processo ${np}`)
        peca.pConteudo = obterConteudoDaPeca(dossier_ids[np], np, peca.id, peca.descr, peca.sigilo, interop)
        if (synchronous)
            await peca.pConteudo
    }
    return pecas
}

const iniciarObtencaoDeDocumentoGravado = (dossier_id: number, numeroDoProcesso: string, pecas: PecaType[]) => {
    for (const peca of pecas) {
        peca.pDocumento = obterDocumentoGravado(dossier_id, numeroDoProcesso, peca.id, peca.descr)
    }
    return pecas
}

export enum CargaDeConteudoEnum {
    SINCRONO = 'SINCRONO',
    ASSINCRONO = 'ASSINCRONO',
    NAO = 'NAO'
}

export type ObterDadosDoProcessoType = {
    numeroDoProcesso: string
    pUser: Promise<any>,
    idDaPeca?: string | string[]
    completo?: boolean
    kind?: string
    pieces?: string[]
    conteudoDasPecasSelecionadas?: CargaDeConteudoEnum
}

export const getInteropFromUser = async (user: UserType): Promise<Interop> => {
    const username = user?.email
    const password = user?.encryptedPassword ? decrypt(user?.encryptedPassword) : undefined
    const system = user?.system

    const interop = getInterop(system, username, password)
    await interop.init()
    return interop
}

export const getSystemIdAndDossierId = async (user: UserType, numeroDoProcesso: string): Promise<{ system_id: number, dossier_id: number }> => {
    const system_id = await SystemDao.assertSystemId(user?.system || 'PDPJ')
    const dossier_id = await DossierDao.assertIADossierId(numeroDoProcesso, system_id, undefined, undefined)
    return { system_id, dossier_id }
}

export const obterDadosDoProcesso = async ({ numeroDoProcesso, pUser, idDaPeca, completo, kind, pieces, conteudoDasPecasSelecionadas = CargaDeConteudoEnum.ASSINCRONO }: ObterDadosDoProcessoType): Promise<DadosDoProcessoType> => {
    let pecas: PecaType[] = []
    let errorMsg = undefined
    try {
        const user = await pUser
        const interop = await getInteropFromUser(user)
        const arrayDadosDoProcesso = await interop.consultarProcesso(numeroDoProcesso)
        let dadosDoProcesso = arrayDadosDoProcesso[arrayDadosDoProcesso.length - 1]

        let apenasPecasEspecificas: string[] = []
        if (typeof idDaPeca === 'string') {
            if (idDaPeca)
                apenasPecasEspecificas = [idDaPeca]
        } else if (Array.isArray(idDaPeca)) {
            if (idDaPeca.length > 0)
                apenasPecasEspecificas = idDaPeca
        }

        // localiza a tramitação que contém a peça solicitada
        if (apenasPecasEspecificas.length > 0) {
            dadosDoProcesso = arrayDadosDoProcesso.find(d => d.pecas.map(p => p.id).includes(apenasPecasEspecificas[0]))
            if (!dadosDoProcesso) {
                throw new Error(`Peças específicas ${apenasPecasEspecificas.join(', ')} não encontradas no processo ${numeroDoProcesso}`)
            }
        }

        pecas = [...dadosDoProcesso.pecas]

        // grava os dados do processo no banco
        const { system_id, dossier_id } = await getSystemIdAndDossierId(user, numeroDoProcesso)
        const outrosNumerosDeProcesso = new Set<string>()
        for (const peca of pecas) {
            const np = peca.numeroDoProcesso || numeroDoProcesso
            if (np !== numeroDoProcesso)
                outrosNumerosDeProcesso.add(np)
        }
        const dossier_ids: { [key: string]: number } = {}
        dossier_ids[numeroDoProcesso] = dossier_id
        for (const np of outrosNumerosDeProcesso) {
            const d_id = await DossierDao.assertIADossierId(np, system_id, undefined, undefined)
            dossier_ids[np] = d_id
        }

        // Se for especificado o id da peça, filtra as peças
        if (apenasPecasEspecificas.length > 0) {
            const pecasFiltradas = pecas.filter(p => apenasPecasEspecificas.includes(p.id))
            const idsEncontrados = new Set(pecasFiltradas.map(p => p.id))
            const idsNaoEncontrados = apenasPecasEspecificas.filter(id => !idsEncontrados.has(id))
            if (idsNaoEncontrados.length > 0) {
                throw new Error(`Peça(s) com id ${idsNaoEncontrados.join(', ')} não encontrada(s) no processo ${numeroDoProcesso}`)
            }
            pecas = pecasFiltradas

            const pecasComConteudo = conteudoDasPecasSelecionadas === CargaDeConteudoEnum.NAO ? pecas : await iniciarObtencaoDeConteudo(dossier_ids, numeroDoProcesso, pecas, interop)
            return { ...dadosDoProcesso, pecas: pecasComConteudo, pecasSelecionadas: pecasComConteudo }
        }

        let selecao: SelecionarPecasResultado = { pecas: null }
        let pecasSelecionadas: PecaType[] | null = null
        let tipoDeSinteseSelecionado: string | null = null

        // Localiza um tipo de síntese válido
        const tipos = (await getTiposDeSinteseValido()).filter(t => t.share === 'PADRAO' || t.share === 'PUBLICO')
        for (const tipoDeSintese of tipos) {
            const pecasAcessiveis = pecas.filter(p => isNivelDeSigiloPermitido(user, p.sigilo))
            selecao = selecionarPecasPorPadraoComFase(pecasAcessiveis, tipoDeSintese.padroes)
            pecasSelecionadas = selecao.pecas
            if (pecasSelecionadas !== null) {
                tipoDeSinteseSelecionado = tipoDeSintese.id
                break
            }
            if (pecasSelecionadas !== null) break
        }

        // Se for especificado o tipo de síntese, substitui 
        if (kind === '0') kind = undefined
        if (kind) {
            tipoDeSinteseSelecionado = kind
            const pecasAcessiveis = pecas.filter(p => isNivelDeSigiloPermitido(user, p.sigilo))

            // Try to get piece_strategy from aggregator DB record
            let padroes = null
            const aggregator = await getAggregatorByKind(kind).catch(() => null)
            const pieceStrategyName = aggregator?.content?.piece_strategy
            if (pieceStrategyName) {
                const strategy = PieceStrategy[pieceStrategyName]
                if (strategy?.pattern) padroes = strategy.pattern
            }

            if (padroes) {
                selecao = selecionarPecasPorPadraoComFase(pecasAcessiveis, padroes)
                pecasSelecionadas = selecao.pecas
            }
        }
        if (!tipoDeSinteseSelecionado) tipoDeSinteseSelecionado = 'RESUMOS_TRIAGEM'

        // Se forem especificadas as peças desejadas, substitui a lista de peças selecionadas
        if (pieces) {
            pecasSelecionadas = pecas.filter(p => pieces.includes(p.id))
        }

        // Se a peça for sigilosa, remove o conteúdo
        for (const peca of pecas)
            if (!isNivelDeSigiloPermitido(user, peca.sigilo)) {
                devLog('removendo conteúdo de peca com sigilo', peca.id, peca.sigilo)
                peca.pConteudo = undefined
                peca.conteudo = TEXTO_PECA_SIGILOSA
            }

        if (completo) pecasSelecionadas = pecas

        let pecasComConteudo: PecaType[] = []
        if (pecasSelecionadas)
            pecasComConteudo = conteudoDasPecasSelecionadas === CargaDeConteudoEnum.NAO ? pecasSelecionadas : await iniciarObtencaoDeConteudo(dossier_ids, numeroDoProcesso, pecasSelecionadas, interop)
        if (pecasComConteudo?.length > 0 && conteudoDasPecasSelecionadas === CargaDeConteudoEnum.SINCRONO) {
            devLog(`Processando ${pecasComConteudo.length} peças selecionadas para o processo ${numeroDoProcesso}`)
            let i = 0
            for (const peca of pecasComConteudo) {
                i++
                devLog(`processando peça ${i}`, peca.id, peca.descr)
                if (!peca.conteudo && peca.pConteudo) {
                    const c = await peca.pConteudo
                    if (c?.errorMsg) {
                        peca.conteudo = `${TEXTO_PECA_COM_ERRO} - ${c.errorMsg}`
                    } else {
                        peca.conteudo = c?.conteudo
                    }
                }
                delete peca.pConteudo
            }
        }
        return { ...dadosDoProcesso, pecasSelecionadas: pecasComConteudo, tipoDeSintese: tipoDeSinteseSelecionado }
        // return { ...dadosDoProcesso, pecas: [] as PecaType[], pecasSelecionadas: [] as PecaType[], tipoDeSintese: tipoDeSinteseSelecionado }
    } catch (error) {
        if (error?.message === 'NEXT_REDIRECT') throw error
        Sentry.captureException(error, { tags: { function: 'obterDadosDoProcesso', numeroDoProcesso } })
        devLog(`Erro ao obter dados do processo ${numeroDoProcesso}: ${error.stack}`)
        errorMsg = `${error.message}`
        return { pecas, poloAtivo: '', poloPassivo: '', errorMsg }
    }
}

export const obterDadosDoProcesso2 = async ({ numeroDoProcesso, pUser, pieces, conteudoDasPecasSelecionadas = CargaDeConteudoEnum.ASSINCRONO }: ObterDadosDoProcessoType): Promise<{ arrayDeDadosDoProcesso?: DadosDoProcessoType[], errorMsg?: string | undefined }> => {
    let pecas: PecaType[] = []
    let errorMsg = undefined
    try {
        const user = await pUser
        const username = user?.email
        const password = user?.encryptedPassword ? decrypt(user?.encryptedPassword) : undefined
        const system = user?.system

        const interop = getInterop(system, username, password)
        await interop.init()

        const dadosDoProcesso = await interop.consultarProcesso(numeroDoProcesso)
        // pecas = [...dadosDoProcesso.pecas]

        // // grava os dados do processo no banco
        // const system_id = await Dao.assertSystemId(user?.system || 'PDPJ')
        // const dossier_id = await Dao.assertIADossierId(numeroDoProcesso, system_id, dadosDoProcesso.codigoDaClasse, dadosDoProcesso.ajuizamento)

        return { arrayDeDadosDoProcesso: [...dadosDoProcesso] }
        // return { ...dadosDoProcesso, pecas: [] as PecaType[], pecasSelecionadas: [] as PecaType[], tipoDeSintese: tipoDeSinteseSelecionado }
    } catch (error) {
        if (error?.message === 'NEXT_REDIRECT') throw error
        Sentry.captureException(error, { tags: { function: 'obterDadosDoProcesso2', numeroDoProcesso } })
        devLog(`Erro ao obter dados do processo ${numeroDoProcesso}: ${error.stack}`)
        errorMsg = `${error.message}`
        return { errorMsg }
    }
}