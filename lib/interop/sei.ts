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
        const data: SeiInput = await this.consultarProcessoSei(numeroDoProcesso)

        if (!data || (!data.andamentos && !data.documentos)) {
            throw new Error(`Não foi possível encontrar o processo ${numeroDoProcesso} no SEI`)
        }
        const processos: InteropProcessoType[] = mapSeiToSimplified(data)
        if (!processos || !processos.length) {
            throw new Error(`Não foi possível mapear o processo ${numeroDoProcesso} no SEI`)
        }
        return processos
    }

    public consultarProcesso = async (numProc: string, _recursivo?: boolean): Promise<DadosDoProcessoType[]> => {
        const numeroDoProcesso = this.limparEValidarNumeroProcesso(numProc)

        const data: SeiInput = await this.consultarProcessoSei(numeroDoProcesso)

        assertNivelDeSigilo(this.user, '' + data.nivelSigilo)

        // Aproveitar mapSeiToSimplified para obter movimentosEDocumentos já construídos.
        let simplified: InteropProcessoType | undefined
        try {
            const arr = mapSeiToSimplified(data)
            simplified = arr[0]
        } catch (e: any) {
            console.error(`Erro ao mapear movimentosEDocumentos para o processo ${numeroDoProcesso} no SEI: ${e.message}`)
        }

        const ajuizamento = new Date(data.dataGeracao)
        const nomeOrgaoJulgador = data.orgao?.nome
        const codigoDaClasse = data.tipoProcedimento?.id || 0
        const classe = data.tipoProcedimento?.nome
        const segmento = ''
        const instancia = ''
        const materia = data.tipoProcedimento?.nome || ''

        // Interessados (SEI tipicamente envia vazio; mapeia o que existir).
        const interessados = data.interessados || []
        const partesPoloAtivo = interessados.filter((p: any) => p.polo === 'ATIVO')
        const partesPoloPassivo = interessados.filter((p: any) => p.polo === 'PASSIVO')
        const poloAtivo = partesPoloAtivo.length ? `${partesPoloAtivo[0]?.nome || ''}${partesPoloAtivo.length > 1 ? ` + ${partesPoloAtivo.length - 1}` : ''}` : ''
        const poloPassivo = partesPoloPassivo.length ? `${partesPoloPassivo[0]?.nome || ''}${partesPoloPassivo.length > 1 ? ` + ${partesPoloPassivo.length - 1}` : ''}` : ''

        // Constroi índice numeroDoDocumento → movimento (sequencia/descricao) para
        // preencher numeroDoEvento/descricaoDoEvento de cada peça.
        const docParaMovimento = new Map<string, { sequencia: string, descricao: string }>()
        for (const mov of simplified?.movimentosEDocumentos || []) {
            for (const d of mov.documentos) {
                docParaMovimento.set(d.id, { sequencia: String(mov.sequencia), descricao: mov.descricao })
            }
        }

        const pecas: PecaType[] = (data.documentos || []).map((doc) => {
            const mov = docParaMovimento.get(doc.numero)
            return {
                id: doc.numero,
                idOrigem: doc.idDocumento,
                numeroDoProcesso,
                numeroDoEvento: mov?.sequencia ?? '',
                descricaoDoEvento: mov?.descricao ?? '',
                descr: (doc.tipo || doc.nome || '').toUpperCase(),
                tipoDoConteudo: doc.mimeType,
                sigilo: nivelDeSigiloFromNivel(doc.nivelSigilo),
                pConteudo: undefined,
                conteudo: undefined,
                pDocumento: undefined,
                documento: undefined,
                categoria: undefined,
                rotulo: doc.nome,
                dataHora: new Date(doc.dataHora),
            } as PecaType
        }).sort((a, b) => (b.dataHora?.getTime() ?? 0) - (a.dataHora?.getTime() ?? 0)) // mais recente primeiro

        const resp: DadosDoProcessoType[] = [{
            numeroDoProcesso, ajuizamento, codigoDaClasse, classe, nomeOrgaoJulgador, pecas,
            movimentosEDocumentos: simplified?.movimentosEDocumentos, segmento, instancia, materia, poloAtivo, poloPassivo
        }]

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
