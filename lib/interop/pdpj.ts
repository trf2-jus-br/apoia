import { fixSigiloDePecas, Interop, ObterPecaType } from './interop'
import { DadosDoProcessoType, Instance, PecaType } from '../proc/process-types'
import { parseYYYYMMDDHHMMSS, slugify } from '../utils/utils'
import { assertNivelDeSigilo } from '../proc/sigilo'
import { getCurrentUser } from '../user'
import { envString } from '../utils/env'
import { tua } from '../proc/tua'
import { InteropProcessoType } from './interop-types'
import { mapPdpjToSimplified, PdpjInput } from './pdpj-mapping'
import { P, T } from '../proc/combinacoes'

const mimeTypyFromTipo = (tipo: string): string => {
    switch (tipo) {
        case 'APPLICATION_PDF': return 'application/pdf'
        case 'TEXT_HTML': return 'text/html'
        default: return 'application/pdf'
    }
}

export const nivelDeSigiloFromNivel = (nivel: string): string => {
    const n = Number(nivel as any)
    if (!Number.isNaN(n)) return String(Math.trunc(n))
    switch (nivel) {
        case 'PUBLICO': return '0'
        case 'SEGREDO_JUSTICA': return '1'
        case 'SIGILO_MINIMO': return '2'
        case 'SIGILO_MEDIO': return '3'
        case 'SIGILO_INTENSO': return '4'
        case 'SIGILO_ABSOLUTO': return '5'
        default: return '5'
    }
}

export class InteropPDPJ implements Interop {
    private accessToken: string

    async init() {
        const user = await getCurrentUser()

        // Utiliza um token fixo, previamente configurado
        if (envString('DATALAKE_TOKEN')) {
            this.accessToken = envString('DATALAKE_TOKEN')
            return
        }

        // Obter o token de acesso do usuário logado pelo keycloak
        if (user.accessToken) {
            this.accessToken = user.accessToken
            return
        }

        // Obtem um token de aplicação
        if (envString('DATALAKE_CLIENT_ID') && envString('DATALAKE_CLIENT_SECRET')) {
            const authResp = await fetch(
                envString('KEYCLOAK_ISSUER') + '/protocol/openid-connect/token',
                {
                    method: 'POST',
                    headers: {
                        'Accept': '*/*',
                        'User-Agent': 'Apoia Client',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        client_id: envString('DATALAKE_CLIENT_ID'),
                        client_secret: envString('DATALAKE_CLIENT_SECRET'),
                        scope: 'openid',
                        grant_type: 'client_credentials'
                    }),
                    next: { revalidate: 3600 } // Revalida a cada hora
                }
            )

            const authRespData = await authResp.json()
            this.accessToken = authRespData.access_token
            return
        }
        throw new Error('Não foi possível obter o token de acesso ao DataLake')
    }

    public autenticar = async (system: string): Promise<boolean> => {
        throw new Error('Not implemented')
    }



    private consultarProcessoPdpj = async (numeroDoProcesso: string) => {
        const response = await fetch(
            envString('DATALAKE_API_URL') + `/processos/${numeroDoProcesso}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'curl'
                },
                next: { revalidate: 3600 } // Revalida a cada hora
            }
        )


        let data: any = {}

        const b = await response.arrayBuffer()
        const decoder = new TextDecoder('utf-8')
        const texto = decoder.decode(b)
        if (response.headers.get('Content-Type') === 'application/json') {
            data = JSON.parse(texto)
        }
        if (response.status !== 200) {
            try {
                throw new Error(data?.message)
            } catch (e) {
                throw new Error(`Não foi possível acessar o processo ${numeroDoProcesso} no DataLake/Codex da PDPJ (${e})`)
            }
        }
        return data
    }

    public consultarMetadadosDoProcesso = async (numeroDoProcesso: string): Promise<InteropProcessoType[]> => {
        const data: PdpjInput = await this.consultarProcessoPdpj(numeroDoProcesso)

        if (!data || !data[0] || !data[0].tramitacoes || !data[0].tramitacoes.length) {
            throw new Error(`Não foi possível encontrar o processo ${numeroDoProcesso} no DataLake/Codex da PDPJ`)
        }

        const processos: InteropProcessoType[] = mapPdpjToSimplified(data[0])
        if (!processos || !processos.length) {
            throw new Error(`Não foi possível mapear o processo ${numeroDoProcesso} no DataLake/Codex da PDPJ`)
        }
        return processos
    }

    public consultarProcesso = async (numeroDoProcesso: string, recursivo?: boolean): Promise<DadosDoProcessoType[]> => {
        let data: any = await this.consultarProcessoPdpj(numeroDoProcesso)

        const resp: DadosDoProcessoType[] = []
        for (const processo of data[0].tramitacoes) {
            const idClasse = processo?.classe?.[0]?.codigo
            assertNivelDeSigilo('' + processo.nivelSigilo)

            const ajuizamento = new Date(processo.dataHoraAjuizamento)
            const nomeOrgaoJulgador = processo.tribunal.nome
            const codigoDaClasse = processo.classe[0]?.codigo || 0
            const segmento = processo.tribunal.segmento
            const instancia = processo.instancia
            const materia = processo.natureza
            const poloAtivo = processo.partes.filter(p => p.polo === 'ATIVO')
            const representantesDePoloAtivo = poloAtivo.map(p => p.representantes).flat()
            const primeiraOabDePoloAtivo = representantesDePoloAtivo.find(r => r && r.oab && r.oab[0]?.numero)?.oab[0]
            const oabPoloAtivo = primeiraOabDePoloAtivo ? `${primeiraOabDePoloAtivo.numero}/${primeiraOabDePoloAtivo.uf}` : undefined
            // const primeiraOabDePoloAtivo = processo.partes.find(p => p.polo === 'ATIVO' && p.representantes?.length > 0 && p.representantes[0].oab?.numero)?.representantes[0].oab
            // const oabPoloAtivo = primeiraOabDePoloAtivo ? `${primeiraOabDePoloAtivo.numero}/${primeiraOabDePoloAtivo.uf}` : undefined

            let pecas: PecaType[] = []
            const documentos = processo.documentos

            // Para descobrir qual o número do evento que está relacionado a cada documento é necessário
            // ver se existe um movimento em "processo.movimentos" que tenha o "idDocumento" igual ao "id" do documento
            // Se houver, o número do evento será igual ao "sequencia" do movimento. Se não houver,
            // o número do evento será igual ao "sequencia" do movimento do documento anterior.
            // A lista de documentos deve ser varrida de trás para frente, para começar pela petição incial.

            // Inicialmente, vamos criar um mapa para relacionar os idDocumento com os movimentos
            const movimentosMap: Map<string, any> = new Map()
            for (const mov of processo.movimentos) {
                if (mov.idDocumento)
                    movimentosMap.set(mov.idDocumento, mov)
            }

            // Agora, vamos varrer os documentos de trás para frente
            let mov = processo.movimentos[processo.movimentos.length - 1]
            for (let i = documentos.length - 1; i >= 0; i--) {
                const doc = documentos[i]
                const relatedMov = movimentosMap.get(doc.id)
                if (relatedMov) mov = relatedMov
                pecas.push({
                    id: doc.id,
                    idOrigem: doc.idOrigem,
                    numeroDoProcesso,
                    numeroDoEvento: mov.sequencia,
                    descricaoDoEvento: mov.descricao,
                    descr: doc.tipo.nome.toUpperCase(),
                    tipoDoConteudo: mimeTypyFromTipo(doc.arquivo?.tipo),
                    sigilo: nivelDeSigiloFromNivel(doc.nivelSigilo),
                    pConteudo: undefined,
                    conteudo: undefined,
                    pDocumento: undefined,
                    documento: undefined,
                    categoria: undefined,
                    rotulo: doc.nome,
                    dataHora: new Date(doc.dataHoraJuntada),
                })
            }
            const classe = tua[codigoDaClasse]

            // Se a classe for de agravo, renomeia a descrição da primeira "PETIÇÃO INICIAL" para "AGRAVO"
            if (classe) {
                if (slugify(classe).includes('agravo-de-instrumento')) {
                    const idx = pecas.findIndex((p: PecaType) => slugify(p.descr || '').includes('peticao-inicial'))
                    if (idx >= 0) pecas[idx].descr = T.AGRAVO_DE_INSTRUMENTO
                } else if (slugify(classe).includes('agravo')) {
                    const idx = pecas.findIndex((p: PecaType) => slugify(p.descr || '').includes('peticao-inicial'))
                    if (idx >= 0) pecas[idx].descr = T.AGRAVO
                }
            }

            resp.push({ numeroDoProcesso, ajuizamento, codigoDaClasse, classe, nomeOrgaoJulgador, pecas, segmento, instancia, materia, oabPoloAtivo })

            // Se o processo tem processos relacionados, vamos pegar o originario    
            if (processo.processosRelacionados?.length && !recursivo) {
                const processoOriginario = processo.processosRelacionados.find((p: any) => p.tipoRelacao === 'ORIGINARIO' && p.numeroProcesso !== numeroDoProcesso)
                if (processoOriginario) {
                    const numeroDoProcessoOriginario = processoOriginario.numeroProcesso
                    const idClasseOriginario = processoOriginario.classe?.id
                    try {
                        const originario = await this.consultarProcesso(numeroDoProcessoOriginario, true)
                        // Tenta selecionar um processo originário da classe informada em processoOriginario.classe.id
                        let originarioSelecionado: DadosDoProcessoType
                        if (idClasseOriginario) {
                            originarioSelecionado = originario.find(p => p.codigoDaClasse === idClasseOriginario)
                        }
                        if (!originarioSelecionado && originario.length) originarioSelecionado = originario[0]
                        if (originarioSelecionado) {
                            originarioSelecionado.classe = originarioSelecionado.classe ? `${originarioSelecionado.classe} (Originário)` : '(Originário)'
                            resp.push(originarioSelecionado)
                        }
                    } catch (e) {
                        console.error(`Erro ao consultar processo originário ${numeroDoProcessoOriginario}, do processo principal ${numeroDoProcesso}: ${e.message}`)
                    }
                }
            }
        }

        aggregateProcessos(resp)

        return fixSigiloDePecas(resp)
    }

    public obterPeca = async (numeroDoProcesso, idDaPeca, binary?: boolean): Promise<ObterPecaType> => {
        const response = await fetch(
            envString('DATALAKE_API_URL') + `/processos/${numeroDoProcesso}/documentos/${idDaPeca}/${binary ? 'binario' : 'texto'}`,
            {
                method: 'GET',
                headers: {
                    'Accept': '*',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': 'curl'
                },
                next: { revalidate: 3600 } // Revalida a cada hora
            }
        );
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
                throw new Error(`Não foi possível obter o texto da peça no DataLake/Codex da PDPJ. (${e} - ${numeroDoProcesso}/${idDaPeca})`)
            }
        }
        const contentType = response.headers.get('Content-Type')
        if (contentType === 'text/html') {
            const decoder = new TextDecoder('utf-8')
            let texto = decoder.decode(b)
            if (texto) {
                texto = texto.replace(/encoding="ISO-8859-1"/g, 'encoding="UTF-8"')
                texto = texto.replace(/<meta charset="ISO-8859-1"\/>/g, '')
            }

            const encoder = new TextEncoder();
            const buffer = encoder.encode(texto).buffer;
            return { contentType, buffer: buffer as ArrayBuffer };

        }
        const ab = b.slice(0, b.byteLength)
        const resultado = { buffer: ab, contentType }
        return resultado;
    }
}

export function aggregateProcessos(resp: DadosDoProcessoType[]) {
    if (resp.length > 1) {
        resp.sort((a, b) => {
            if (a.classe?.endsWith(' (Originário)') && !b.classe?.endsWith(' (Originário)')) return 1
            if (!a.classe?.endsWith(' (Originário)') && b.classe?.endsWith(' (Originário)')) return -1
            const latestPecaDateA = a.pecas.length ? Math.max(...a.pecas.map(p => p.dataHora.getTime())) : 0
            const latestPecaDateB = b.pecas.length ? Math.max(...b.pecas.map(p => p.dataHora.getTime())) : 0
            return latestPecaDateB - latestPecaDateA
        })
        const combinado = resp.reduce((acc, p) => {
            acc.pecas.push(...p.pecas.map(peca => ({ ...peca, numeroDoEvento: peca.numeroDoEvento + (Instance[p.instancia] ? `, ${Instance[p.instancia].acronym} Grau` : '') })))
            return acc
        }, { ...resp[0], classe: `[Processos Agregados]`, pecas: [] })
        combinado.pecas.sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime())
        resp.push(combinado)
    }
}
