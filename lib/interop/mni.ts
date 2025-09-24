import { createHash } from 'node:crypto'

import * as soap from 'soap'
import { envString, systems } from '@/lib/utils/env'
import { assertCurrentUser } from '@/lib/user'

import pLimit from 'p-limit'
import { fixSigiloDePecas, Interop, ObterPecaType } from './interop'
import { DadosDoProcessoType, PecaType } from '../proc/process-types'
import { parseYYYYMMDDHHMMSS } from '../utils/utils'
import { assertNivelDeSigilo } from '../proc/sigilo'
import { tua } from '../proc/tua'
import { InteropProcessoType } from './interop-types'

const limit = pLimit(envString('MNI_LIMIT') ? parseInt(envString('MNI_LIMIT')) : 1)

const clientMap = new Map<string, soap.Client>()

const getClient = async (system: string | undefined) => {
    if (system === undefined) {
        const user = await assertCurrentUser()
        system = user.image.system
    }
    let client = clientMap.get(system as string)
    if (client !== undefined)
        return client
    const systemData = systems.find(s => s.system === system)
    client = await soap.createClientAsync(
        systemData?.wsdl as string,
        { parseReponseAttachments: true },
        systemData?.endpoint as string)
    clientMap.set(system as string, client)
    return client
}

const criarHash = (senha: string) => {
    const date = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date()).replaceAll('/', '-');

    const input = `${date}${senha}`;
    const hash = createHash('sha256').update(input).digest('hex');
    return hash;
}

// export const autenticar = async (system: string, username: string, password: string) => {
//     const client = await getClient(system)
//     const currentSystem = systems.find(s => s.system === system)
//     if (!currentSystem) {
//         throw new Error(`Client for system ${system} not found`)
//     }
//     if (currentSystem.hashable) {
//         password = criarHash(password)
//     }
//     const res = await client.consultarProcessoAsync({
//         idConsultante: username,
//         senhaConsultante: password,
//         numeroProcesso: '00000000000000000000',
//         movimentos: false,
//         incluirCabecalho: false,
//         incluirDocumentos: false
//     })
//     return res[0].mensagem.includes(currentSystem.validation)
// }

// export const consultarProcesso = async (numero, username, password) => {
//     const client = await getClient(undefined)
//     // throw an error if the number is invalid
//     if (!numero.match(/^\d{20}$/))
//         throw new Error('Número de processo inválido')
//     const user = await assertCurrentUser()
//     const system = systems.find(s => s.system === user.image.system)
//     if (system?.hashable) {
//         password = criarHash(password)
//     }
//     const pConsultarProcesso = client.consultarProcessoAsync({
//         idConsultante: username,
//         senhaConsultante: password,
//         numeroProcesso: numero,
//         movimentos: true,
//         incluirCabecalho: true,
//         incluirDocumentos: true
//     })
//     return pConsultarProcesso
// }

// export const obterPeca = async (numeroDoProcesso, idDaPeca, username: string, password: string): Promise<ObterPecaType> =>
//     limit(() => obterPecaSemLimite(numeroDoProcesso, idDaPeca, username, password))

const obterPecaSemLimite = async (numeroDoProcesso, idDaPeca, username: string, password: string): Promise<ObterPecaType> => {
    const client = await getClient(undefined)
    const user = await assertCurrentUser()
    const system = systems.find(s => s.system === user.image.system)
    if (system?.hashable) {
        password = criarHash(password)
    }
    const respPeca = await client.consultarProcessoAsync({
        idConsultante: username,
        senhaConsultante: password,
        numeroProcesso: numeroDoProcesso,
        movimentos: false,
        incluirCabecalho: false,
        incluirDocumentos: false,
        documento: [idDaPeca]
    })
    const arquivo = client.lastResponseAttachments.parts[0]
    const b = arquivo.body
    const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
    const resultado: ObterPecaType = { buffer: ab as ArrayBuffer, contentType: respPeca[0].processo.documento[0].attributes.mimetype }
    return resultado
}

export class InteropMNI implements Interop {
    private username: string
    private password: string

    constructor(username: string, password: string) {
        this.username = username
        this.password = password
    }

    public init = async () => { }

    public autenticar = async (system: string): Promise<boolean> => {
        const client = await getClient(system)
        const currentSystem = systems.find(s => s.system === system)
        if (!currentSystem) {
            throw new Error(`Client for system ${system} not found`)
        }
        if (currentSystem.hashable) {
            this.password = criarHash(this.password)
        }
        const res = await client.consultarProcessoAsync({
            idConsultante: this.username,
            senhaConsultante: this.password,
            numeroProcesso: '00000000000000000000',
            movimentos: false,
            incluirCabecalho: false,
            incluirDocumentos: false
        })
        return res[0].mensagem.includes(currentSystem.validation)
    }

    public consultarProcesso = async (numeroDoProcesso: string): Promise<DadosDoProcessoType[]> => {
        const client = await getClient(undefined)
        // throw an error if the number is invalid
        if (!numeroDoProcesso.match(/^\d{20}$/))
            throw new Error('Número de processo inválido')
        const user = await assertCurrentUser()
        const system = systems.find(s => s.system === user.image.system)
        let senhaConsultante = this.password
        if (system?.hashable) {
            senhaConsultante = criarHash(this.password)
        }
        const pConsultarProcesso = client.consultarProcessoAsync({
            idConsultante: this.username,
            senhaConsultante,
            numeroProcesso: numeroDoProcesso,
            movimentos: true,
            incluirCabecalho: true,
            incluirDocumentos: true
        })
        const respQuery = await pConsultarProcesso
        if (!respQuery[0].sucesso)
            throw new Error(`${respQuery[0].mensagem}`)
        const dadosBasicos = respQuery[0].processo.dadosBasicos
        const sigilo = '' + dadosBasicos.attributes.nivelSigilo
        assertNivelDeSigilo(sigilo)
        const dataAjuizamento = dadosBasicos.attributes.dataAjuizamento
        // console.log('dadosBasicos', dadosBasicos)
        const nomeOrgaoJulgador = dadosBasicos.orgaoJulgador.attributes.nomeOrgao
        const ajuizamento = parseYYYYMMDDHHMMSS(dataAjuizamento)
        // ajuizamentoDate.setTime(ajuizamentoDate.getTime() - ajuizamentoDate.getTimezoneOffset() * 60 * 1000)
        const codigoDaClasse = parseInt(dadosBasicos.attributes.classeProcessual)

        let pecas: PecaType[] = []
        const documentos = respQuery[0].processo.documento
        // console.log('documentos', JSON.stringify(documentos, null, 2))
        for (const doc of documentos) {
            // if (!Object.values(T).includes(doc.attributes.descricao)) continue
            pecas.unshift({
                id: doc.attributes.idDocumento,
                numeroDoProcesso,
                numeroDoEvento: doc.attributes.movimento,
                descricaoDoEvento: '',
                descr: doc.attributes.descricao,
                tipoDoConteudo: doc.attributes.mimetype,
                sigilo: '' + doc.attributes.nivelSigilo,
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: doc.outroParametro?.find(p => p?.attributes?.nome === 'rotulo')?.attributes.valor,
                dataHora: parseYYYYMMDDHHMMSS(doc.attributes.dataHora),
            })
        }

        const parseRotulo = (rotulo: string) => {
            const match = rotulo.match(/^([A-Z]+)(\d+)$/)
            if (match) {
                return { letters: match[1], number: parseInt(match[2], 10) }
            }
            return { letters: '', number: 0 }
        }

        pecas.sort((a, b) => {
            let i = parseInt(a.numeroDoEvento) - parseInt(b.numeroDoEvento)
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
        const classe = tua[codigoDaClasse]
        return fixSigiloDePecas([{ numeroDoProcesso, ajuizamento, codigoDaClasse, classe, nomeOrgaoJulgador, pecas, poloAtivo: '', poloPassivo: '' }])
    }

    public obterPeca = async (numeroDoProcesso, idDaPeca, binary?: boolean): Promise<ObterPecaType> =>
        limit(() => obterPecaSemLimite(numeroDoProcesso, idDaPeca, this.username, this.password))

    public consultarMetadadosDoProcesso = async (numeroDoProcesso: string): Promise<InteropProcessoType[]> => {
        throw new Error('Método consultarMetadadosDoProcesso não implementado para MNI')
    }
}



