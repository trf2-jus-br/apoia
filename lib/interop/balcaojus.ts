import { System, systems } from '@/lib/utils/env'
import { assertCurrentUser } from '@/lib/user'
import pLimit from 'p-limit'
import { fixSigiloDePecas, Interop, ObterPecaType } from './interop'
import { aggregateProcessos } from './pdpj'
import { DadosDoProcessoType, Instance, PecaType } from '../proc/process-types'
import { parseYYYYMMDDHHMMSS } from '../utils/utils'
import { assertNivelDeSigilo } from '../proc/sigilo'
import { tua } from '../proc/tua'
import { InteropProcessoType } from './interop-types'

const limit = pLimit(1)

const buildPecaId = (sistema: string, idDaPeca: string): string => {
    return `${sistema}-${idDaPeca}`
}

const parsePecaId = (pecaId: string): { sistema: string, idDaPeca: string } => {
    const [sistema, idDaPeca] = pecaId.split('-')
    return { sistema, idDaPeca }
}

const obterPecaSemLimite = async (numeroDoProcesso: string, idDaPeca: string, system: System, token?: string): Promise<ObterPecaType> => {
    const headers: Record<string, string> = { Accept: '*/*' }
    if (token) headers.Authorization = `Bearer ${token}`
    let { idDaPeca: idDaPecaConsulta, sistema: sistemaConsulta } = parsePecaId(idDaPeca)

    const url = `${system.api}/processo/${numeroDoProcesso}/peca/${idDaPecaConsulta}/pdf?sistema=${encodeURIComponent(sistemaConsulta)}`
    const resp = await fetch(url, { method: 'GET', headers })
    if (!resp.ok) {
        throw new Error(`Erro ao obter peça (${resp.status})`)
    }
    const jwt = (await resp.json()).jwt

    const urlDownload = `${system.api}/download/${jwt}/${numeroDoProcesso}-${idDaPecaConsulta}.pdf`

    const respDownload = await fetch(urlDownload, { method: 'GET', headers })
    if (!respDownload.ok) {
        throw new Error(`Erro ao obter download (${respDownload.status})`)
    }
    const contentType = respDownload.headers.get('Content-Type') || 'application/octet-stream'
    const bufferDownload = await respDownload.arrayBuffer()
    return { buffer: bufferDownload as ArrayBuffer, contentType }
}

export class InteropBalcaojus implements Interop {
    private system: System
    private username: string
    private password: string
    private token: string

    constructor(system: string, username: string, password: string) {
        this.system = systems.find(s => s.system === system)
        if (!this.system) throw new Error(`Sistema ${system} não encontrado`)
        this.username = username
        this.password = password
    }

    public init = async () => { }

    public autenticar = async (system: string): Promise<boolean> => {
        const url = `${this.system.api}/autenticar`
        try {
            const form = new URLSearchParams()
            form.append('username', this.username)
            form.append('password', this.password)

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form.toString()
            })

            if (!resp.ok) return false

            const body = await resp.json()
            if (typeof body === 'object' && body !== null) {
                if (!!body.id_token) {
                    this.token = body.id_token
                    return true
                }
            }
        } catch {
            return false
        }
    }

    public consultarProcesso = async (numeroDoProcesso: string, sistemaAlternativo?: string): Promise<DadosDoProcessoType[]> => {
        if (!this.token) await this.autenticar(this.system.system)

        const isRecursive = !!sistemaAlternativo
        const headers: Record<string, string> = { 'Accept': 'application/json' }
        if (this.token) headers.Authorization = `${this.token}`

        // Descobrir sistema se não informado (apenas na chamada raiz)
        let sistemaConsulta = sistemaAlternativo
        if (!sistemaConsulta) {
            try {
                const validarUrl = `${this.system.api}/processo/validar?numero=${numeroDoProcesso}`
                const respValidar = await fetch(validarUrl, { method: 'GET', headers })
                const bodyValidar = await respValidar.json()
                if (respValidar.ok) {
                    const list = Array.isArray(bodyValidar?.list) ? bodyValidar.list : []
                    if (list.length > 0 && list[0]?.sistema) sistemaConsulta = list[0].sistema
                }
            } catch { /* ignore */ }
        }

        // Consulta principal
        const url = `${this.system.api}/processo/${numeroDoProcesso}/consultar?sistema=${encodeURIComponent(sistemaConsulta || '')}`
        const resp = await fetch(url, { method: 'GET', headers })
        if (!resp.ok) return []
        const body = await resp.json()
        const value = body?.value
        if (!value?.dadosBasicos) return []
        const dadosBasicos = value.dadosBasicos
        const sigilo = '' + (dadosBasicos.nivelSigilo ?? dadosBasicos.nivelSigilo === 0 ? dadosBasicos.nivelSigilo : '')
        assertNivelDeSigilo(sigilo)

        const dataAjuizamento = dadosBasicos.dataAjuizamento
        const ajuizamento = dataAjuizamento ? parseYYYYMMDDHHMMSS(dataAjuizamento) : undefined
        const nomeOrgaoJulgador = dadosBasicos.orgaoJulgador?.nomeOrgao
        const codigoDaClasse = parseInt(dadosBasicos.classeProcessual, 10)
        const classe = tua[codigoDaClasse]
        const numero = dadosBasicos.numero || numeroDoProcesso
        const instancia = sistemaConsulta === 'br.jus.trf2.eproc' ? Instance.SEGUNDO_GRAU : Instance.PRIMEIRO_GRAU

        // Movimentos
        const movimentos: any[] = Array.isArray(value.movimento) ? value.movimento : []
        const movimentoMap = new Map<string, any>()
        for (const mov of movimentos) {
            if (mov?.identificadorMovimento) movimentoMap.set('' + mov.identificadorMovimento, mov)
        }

        // Documentos -> Peças
        const documentos: any[] = Array.isArray(value.documento) ? value.documento : []
        const pecas: PecaType[] = []
        for (const doc of documentos) {
            const mov = movimentoMap.get('' + doc.movimento)
            pecas.push({
                id: buildPecaId(sistemaConsulta || '', doc.idDocumento),
                numeroDoEvento: '' + (doc.movimento ?? ''),
                descricaoDoEvento: mov?.movimentoLocal?.descricao || '',
                descr: (doc.descricao || doc.tipoDocumentoLocal || '').toUpperCase(),
                tipoDoConteudo: doc.mimetype,
                sigilo: '' + (doc.nivelSigilo ?? ''),
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: doc.outroParametro?.rotulo,
                dataHora: doc.dataHora ? parseYYYYMMDDHHMMSS(doc.dataHora) : undefined,
            })
        }
        const parseRotulo = (rotulo: string) => {
            const match = rotulo?.match(/^([A-Z]+)(\d+)$/)
            if (match) return { letters: match[1], number: parseInt(match[2], 10) }
            return { letters: '', number: 0 }
        }
        pecas.sort((a, b) => {
            let i = (parseInt(a.numeroDoEvento) || 0) - (parseInt(b.numeroDoEvento) || 0)
            if (i !== 0) return i
            if (a.rotulo && b.rotulo) {
                const ap = parseRotulo(a.rotulo)
                const bp = parseRotulo(b.rotulo)
                if (ap.letters === bp.letters) {
                    i = ap.number - bp.number
                    if (i !== 0) return i
                }
            }
            if (a.dataHora && b.dataHora) {
                i = a.dataHora.getTime() - b.dataHora.getTime()
                if (i !== 0) return i
            }
            return a.id.localeCompare(b.id)
        })

        // OAB polo ativo
        let oabPoloAtivo: string | undefined = undefined
        try {
            const polos = Array.isArray(dadosBasicos.polo) ? dadosBasicos.polo : []
            const poloAtivo = polos.find(p => p?.polo === 'AT')
            const primeiraParte = poloAtivo?.parte?.[0]
            const primeiraOab = primeiraParte?.advogado?.[0]?.inscricao
            if (primeiraOab) oabPoloAtivo = primeiraOab
        } catch { /* ignore */ }

        const respLista: DadosDoProcessoType[] = [{ numeroDoProcesso: numero, ajuizamento, codigoDaClasse, classe, nomeOrgaoJulgador, pecas, oabPoloAtivo, instancia: instancia.name, sigilo }]

        // Processos vinculados (recursão no mesmo sistema)
        // const vinculados = dadosBasicos?.ProcessosVinculados || dadosBasicos?.processosVinculados
        // if (Array.isArray(vinculados)) {
        //     for (const vinc of vinculados) {
        //         const numeroVinc = vinc?.numeroDoProcesso || vinc?.numero || vinc?.numeroProcesso
        //         if (numeroVinc !== numeroDoProcesso) {
        //             try {
        //                 const vincResp = await this.consultarProcesso(numeroVinc, sistemaConsulta)
        //                 if (vincResp.length) respLista.push(...vincResp)
        //             } catch { /* ignore */ }
        //         }
        //     }
        // }

        // Cross-system apenas na chamada raiz (para evitar loops)
        if (!isRecursive) {
            const crossTargets: string[] = []
            if (sistemaConsulta === 'br.jus.trf2.eproc') {
                crossTargets.push('br.jus.jfrj.eproc', 'br.jus.jfes.eproc')
            } else if (sistemaConsulta === 'br.jus.jfrj.eproc' || sistemaConsulta === 'br.jus.jfes.eproc') {
                crossTargets.push('br.jus.trf2.eproc')
            }
            let processoAIncluir = numeroDoProcesso
            if (value?.dadosBasicos?.processoVinculado && classe?.toLowerCase().includes('agravo')) {
                const vinculados = value?.dadosBasicos?.processoVinculado ? value.dadosBasicos.processoVinculado : []
                if (vinculados.length)
                    processoAIncluir = vinculados[0]?.numeroProcesso
            }
            for (const target of crossTargets) {
                try {
                    const otherResp = await this.consultarProcesso(processoAIncluir, target)
                    if (otherResp.length) {
                        respLista.push(...otherResp)
                        break
                    }
                } catch { /* ignore */ }
            }
        }

        if (!isRecursive && respLista.length > 1) {
            try { aggregateProcessos(respLista) } catch { /* ignore */ }
        }

        return fixSigiloDePecas(respLista)
    }

    public obterPeca = async (numeroDoProcesso, idDaPeca, binary?: boolean): Promise<ObterPecaType> => {
        if (!this.token) await this.autenticar(this.system.system)
        return limit(() => obterPecaSemLimite(numeroDoProcesso, idDaPeca, this.system, this.token))
    }

    public consultarMetadadosDoProcesso = async (_numeroDoProcesso: string): Promise<InteropProcessoType[]> => {
        throw new Error('Método consultarMetadadosDoProcesso não implementado para Balcaojus')
    }
}



