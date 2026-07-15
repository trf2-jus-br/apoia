import { fixSigiloDePecas, Interop, ObterPecaType } from './interop'
import { DadosDoProcessoType, PecaType } from '../proc/process-types'
import { assertNivelDeSigilo } from '../proc/sigilo'
import { assertCourtId, getCurrentUser, UserType } from '../user'
import { envString, envStringPrefixed } from '../utils/env'
import { InteropProcessoType } from './interop-types'
import { mapSeiToSimplified, SeiInput } from './sei-mapping'
import { aggregateProcessos, nivelDeSigiloFromNivel } from './pdpj'
import { CannotAccessPieceTextError, CannotAccessProcessMetadataError, InvalidProcessNumberError } from '../utils/api-error'

const REVALIDATE = undefined

// Type para os campos utilizados no método consultarProcesso
type SeiProcessoResponse = {
    tramitacoes: SeiInput['tramitacoes']
}[]

export class InteropSEI implements Interop {
    private accessToken: string
    private seiApiUrl: string // já contém ?path=/apoia
    private user: UserType

    async init() {
        this.user = await getCurrentUser()

        // SEI_API_URL (eventualmente prefixada por tribunal: TRIBUNAL_{seq}_SEI_API_URL)
        // já vem com ?path=/apoia; as chamadas adicionam /processos/{num}...
        const seqTribunalPai = this.user ? '' + (assertCourtId(this.user)) : undefined
        this.seiApiUrl = envStringPrefixed('SEI_API_URL', seqTribunalPai)

        // Utiliza o mesmo token do DataLake/PDPJ, enviado como Bearer para o SEI.
        if (envString('DATALAKE_TOKEN')) {
            this.accessToken = envString('DATALAKE_TOKEN')
            return
        }
        if (this.user?.accessToken) {
            this.accessToken = this.user.accessToken
            return
        }
        throw new Error('Não foi possível obter o token de acesso ao SEI')
    }

    public autenticar = async (_system: string): Promise<boolean> => {
        throw new Error('Not implemented')
    }

    private limparEValidarNumeroProcesso(numero: string): string {
        const n = numero.replace(/\D/g, '')
        if (n.length !== 20)
            throw new InvalidProcessNumberError(`Número do processo inválido: ${numero}`)
        return n
    }

    private consultarProcessoSei = async (numeroDoProcesso: string) => {
        const num = this.limparEValidarNumeroProcesso(numeroDoProcesso)
        const response = await fetch(
            `${this.seiApiUrl}/processos/${num}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'curl'
                },
                next: { revalidate: REVALIDATE }
            }
        )

        const b = await response.arrayBuffer()
        const decoder = new TextDecoder('utf-8')
        const texto = decoder.decode(b)
        let data: any = undefined
        if (response.headers.get('Content-Type') === 'application/json')
            data = JSON.parse(texto)
        if (response.status !== 200) {
            throw new CannotAccessProcessMetadataError(`Não foi possível acessar o processo ${numeroDoProcesso} no SEI (${data ? data?.message || JSON.stringify(data) : response.statusText})`)
        }
        return data
    }

    public consultarMetadadosDoProcesso = async (numeroDoProcesso: string): Promise<InteropProcessoType[]> => {
        const data: SeiProcessoResponse = await this.consultarProcessoSei(numeroDoProcesso)

        if (!data || !data[0] || !data[0].tramitacoes || !data[0].tramitacoes.length) {
            throw new Error(`Não foi possível encontrar o processo ${numeroDoProcesso} no SEI`)
        }
        const processos: InteropProcessoType[] = mapSeiToSimplified(data[0] as SeiInput)
        if (!processos || !processos.length) {
            throw new Error(`Não foi possível mapear o processo ${numeroDoProcesso} no SEI`)
        }
        return processos
    }

    public consultarProcesso = async (numProc: string, _recursivo?: boolean): Promise<DadosDoProcessoType[]> => {
        const numeroDoProcesso = this.limparEValidarNumeroProcesso(numProc)

        const data: SeiProcessoResponse = await this.consultarProcessoSei(numeroDoProcesso)

        // Aproveitar mapSeiToSimplified para obter movimentosEDocumentos já construídos.
        let simplified: InteropProcessoType[] = []
        try {
            simplified = mapSeiToSimplified(data[0] as SeiInput)
        } catch (e: any) {
            console.error(`Erro ao mapear movimentosEDocumentos para o processo ${numeroDoProcesso} no SEI: ${e.message}`)
        }

        const resp: DadosDoProcessoType[] = []
        for (let tramIdx = 0; tramIdx < data[0].tramitacoes.length; tramIdx++) {
            const processo = data[0].tramitacoes[tramIdx]
            assertNivelDeSigilo(this.user, '' + processo.nivelSigilo)

            const ajuizamento = new Date(processo.dataHoraAjuizamento)
            const nomeOrgaoJulgador = processo.tribunal?.nome
            const codigoDaClasse = processo.classe?.[0]?.codigo || 0
            const classe = processo.classe?.[0]?.nome
            const segmento = processo.tribunal?.segmento
            const instancia = processo.instancia || ''
            const materia = processo.natureza
            const partesPoloAtivo = (processo.partes || []).filter((p: any) => p.polo === 'ATIVO')
            const partesPoloPassivo = (processo.partes || []).filter((p: any) => p.polo === 'PASSIVO')
            const poloAtivo = `${partesPoloAtivo[0]?.nome}${partesPoloAtivo.length > 1 ? ` + ${partesPoloAtivo.length - 1}` : ''}` || ''
            const poloPassivo = `${partesPoloPassivo[0]?.nome}${partesPoloPassivo.length > 1 ? ` + ${partesPoloPassivo.length - 1}` : ''}` || ''

            // No SEI, cada documento gera seu próprio movimento sintético em
            // mapSeiToSimplified. Aqui montamos as peças a partir dos documentos,
            // e o númeroDoEvento/descricaoDoEvento vem do movimento sintético
            // correspondente (vinculado 1:1).
            const movimentosSinteticos = (simplified[tramIdx]?.movimentosEDocumentos || [])
                .filter(m => m.descricao === 'Inclusão de Documento')

            const pecas: PecaType[] = (processo.documentos || []).map((doc: any) => {
                // Localiza o movimento sintético correspondente a este documento.
                const mov = movimentosSinteticos.find(m => m.documentos.some(d => d.id === doc.id))
                const docMov = mov?.documentos.find(d => d.id === doc.id)
                return {
                    id: doc.id,
                    idOrigem: doc.idOrigem,
                    numeroDoProcesso,
                    numeroDoEvento: String(mov?.sequencia ?? ''),
                    descricaoDoEvento: mov?.descricao ?? '',
                    descr: (doc.tipo?.nome || doc.nome || '').toUpperCase(),
                    tipoDoConteudo: doc.arquivo?.tipo,
                    sigilo: nivelDeSigiloFromNivel(doc.nivelSigilo),
                    pConteudo: undefined,
                    conteudo: undefined,
                    pDocumento: undefined,
                    documento: undefined,
                    categoria: undefined,
                    rotulo: doc.nome || docMov?.nome,
                    dataHora: new Date(doc.dataHoraJuntada),
                } as PecaType
            })

            const movimentosEDocumentos = simplified[tramIdx]?.movimentosEDocumentos

            resp.push({ numeroDoProcesso, ajuizamento, codigoDaClasse, classe, nomeOrgaoJulgador, pecas, movimentosEDocumentos, segmento, instancia, materia, poloAtivo, poloPassivo })
        }

        aggregateProcessos(resp)

        return fixSigiloDePecas(resp)
    }

    public obterPeca = async (numProc: string, idDaPeca: string, binary?: boolean): Promise<ObterPecaType> => {
        if (!binary) {
            // Obtenção de texto não implementada para o SEI
            binary = true
        }
        const numeroDoProcesso = this.limparEValidarNumeroProcesso(numProc)
        const response = await fetch(
            `${this.seiApiUrl}/processos/${numeroDoProcesso}/documentos/${idDaPeca}`,
            {
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'curl'
                },
                next: { revalidate: REVALIDATE }
            }
        )

        const b = await response.arrayBuffer()
        if (response.status !== 200) {
            try {
                const decoder = new TextDecoder('utf-8')
                const texto = decoder.decode(b)
                if (response.headers.get('Content-Type') === 'application/json') {
                    const data = JSON.parse(texto)
                    throw new Error(data.message)
                }
            } catch (e) {
                throw new CannotAccessPieceTextError(`Não foi possível obter a peça no SEI. (${e} - ${numeroDoProcesso}/${idDaPeca})`)
            }
        }

        const contentType = response.headers.get('Content-Type')
        const ab = b.slice(0, b.byteLength)
        return { buffer: ab, contentType }
    }
}
