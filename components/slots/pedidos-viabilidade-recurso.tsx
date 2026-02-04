'use client'

import AiContent from "@/components/ai-content"
import { getInternalPrompt } from "@/lib/ai/prompt"
import { ContentType, GeneratedContent } from "@/lib/ai/prompt-types"
import { PangeaResultadoItem, PangeaSearchRawResponse } from "@/lib/ai/tools-pangea"
import { P } from "@/lib/proc/combinacoes"
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import { FormHelper } from "@/lib/ui/form-support"

// Tipos para busca semântica
interface SemanticSearchItem {
    item: {
        id: string
        sourceId: string
        externalId: string
        content: string
        data: {
            id: string
            nr: number
            tipo: string
            orgao: string
            questao: string
            situacao?: string
            suspensoes?: Array<{
                ativa: boolean
                descricao: string
                dataSuspensao: string
            }>
            ultimaAtualizacao?: string
        }
    }
    renderedTitle: string
    renderedDisplay: string
    similarity: number
    source: {
        id: string
        slug: string
        name: string
    }
}

interface SemanticSearchResultItem {
    id: string
    nr: number
    tipo: string
    orgao: string
    questao: string
    situacao?: string
    suspensoes?: Array<{
        ativa: boolean
        descricao: string
        dataSuspensao: string
    }>
    ultimaAtualizacao?: string
    renderedTitle: string
}

interface SemanticSearchResponse {
    results: SemanticSearchItem[]
    total: number
}
import { calcMd5 } from "@/lib/utils/hash"
import { labelToName, maiusculasEMinusculas } from "@/lib/utils/utils"
import { useEffect } from "react"
import { Button } from "react-bootstrap"

// Tipos de dispositivo que requerem seleção de tema
const DISPOSITIVOS_COM_TEMA = ['SUSPENDER', 'NEGAR_SEGUIMENTO', 'ENCAMINHAR_PARA_RETRATACAO']

// Função para buscar temas via busca semântica
const semanticSearchDeTemas = async (query: string): Promise<SemanticSearchResultItem[]> => {
    const response = await fetch('/api/v1/semantic/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            limit: 10,
            offset: 0
        })
    })
    if (!response.ok) {
        throw new Error('Erro ao buscar temas')
    }
    const data: SemanticSearchResponse = await response.json()
    return data?.results.map(item => ({ ...item.item.data, renderedTitle: item.renderedTitle })) || []
}

// Formatar item da busca semântica para exibição na lista de opções
const formatarOpcaoTema = (item: SemanticSearchResultItem): string => {
    return `${item.renderedTitle} - ${item.questao}`
}

// Formatar item selecionado para exibição compacta
const formatarTemaSelecionado = (item: SemanticSearchResultItem): string => {
    return item.renderedTitle
}

interface PedidosViabilidadeRecursoProps {
    pedidos: { proximoPrompt: string; pedidos: any[] };
    request: GeneratedContent;
    nextRequest: GeneratedContent;
    Frm: FormHelper;
    dossierCode: string;
    onBusy?: () => void;
    onReady?: (content: ContentType) => void;
    dadosDoProcesso?: DadosDoProcessoType;
}

export const PedidosViabilidadeRecurso = ({ pedidos, request, nextRequest, Frm, dossierCode, onBusy, onReady, dadosDoProcesso }: PedidosViabilidadeRecursoProps) => {
    const tiposDeDispositivo = [
        { id: '', name: '' },
        { id: 'SUSPENDER', name: 'Suspender' }, // tema
        { id: 'NEGAR_SEGUIMENTO', name: 'Negar Seguimento' }, // tema
        { id: 'ENCAMINHAR_PARA_RETRATACAO', name: 'Encaminhar para Retratação' }, // tema
        { id: 'ADMITIR', name: 'Admitir' },
        { id: 'INADIMITIR', name: 'Inadmitir' }, // motivoDaInadimissao
        { id: 'DESCONSIDERAR', name: 'Desconsiderar' },
    ]

    const motivoDaInadimissao = [
        { id: '', name: '' },
        { id: 'FATICA_PROBATORIA', name: 'Súmula 7/STJ e Súmula 279/STF (Fático-probatório)' },
        { id: 'CONFORMIDADE_JURISPRUDENCIA', name: 'Súmula 83/STJ (Conformidade Jurisprudência)' },
        { id: 'FUNDAMENTO_AUTONOMO', name: 'Súmula 283/STF (Fundamento autônomo)' },
        { id: 'DEFICIENCIA_FUNDAMENTACAO', name: 'Súmula 284/STF (Deficiência fundamentação)' },
        { id: 'AUSENCIA_PREQUESTIONAMENTO', name: 'Súmulas 282/STF e 356/STF (Ausência Prequestionamento)' },
        { id: 'NAO_EXAURIMENTO', name: 'Súmula 281/STF (Não exaurimento)' },
        { id: 'INTEMPESTIVIDADE', name: 'Intempestividade' },
        { id: 'DESERCAO', name: 'Deserção' },
        { id: 'FALTA_DE_INTERESSE_RECURSAL', name: 'Falta de Interesse Recursal' },
        { id: 'CLAUSULA_CONTRATUAL', name: 'Súmula 5/STJ (Cláusula Contratual)' },
        { id: 'FUNDAMENTO_CONST_INFRACONST', name: 'Súmula 126/STJ (Fundamento Const/Infraconst)' },
        { id: 'ATOS_NORMATIVOS_INFRALEGAIS', name: 'Atos Normativos Infralegais' },
    ]

    // pedidos com tema.id mas sem tema.questao, obter o tema completo via busca semântica pela id
    useEffect(() => {
        console.log('Verificando pedidos para completar temas via busca semântica...')
        const aPedidos = Frm.get('pedidos').pedidos
        if (!aPedidos || aPedidos.length === 0) return

        const buscarTemasCompletos = async () => {
            const promessas = aPedidos.map(async (pedido: any, index: number) => {
                if (pedido.tema && typeof pedido.tema === 'string') {
                    const idTema = pedido.tema
                    try {
                        console.log(`Buscando tema completo para pedido ${index + 1}...`)
                        const temas = await semanticSearchDeTemas(idTema)
                        const temaCompleto = temas.find(t => t.id === idTema)
                        return { index, temaCompleto }
                    } catch (error) {
                        console.error('Erro ao buscar tema completo:', error)
                        return null
                    }
                }
                return null
            })

            const resultados = await Promise.all(promessas)
            const pedidosAtualizados = [...aPedidos]

            resultados.forEach(resultado => {
                if (resultado && resultado.temaCompleto) {
                    pedidosAtualizados[resultado.index].tema = resultado.temaCompleto
                }
            })

            console.log('Pedidos atualizados com temas completos:', pedidosAtualizados)

            Frm.set('pedidos.pedidos', pedidosAtualizados)
        }

        buscarTemasCompletos()
    }, [Frm, pedidos])

    const pedidosAnalisados = Frm.get('pedidosAnalisados')
    if (pedidosAnalisados) {
        const aPedidos = [...Frm.get('pedidos').pedidos].filter(p => p.dispositivo && p.dispositivo !== 'DESCONSIDERAR')
        const data = { ...request.data }
        data.textos = [...request.data.textos, { numeroDoProcesso: data?.numeroDoProcesso || '', slug: 'pedidos', descr: 'Pedidos', texto: JSON.stringify(aPedidos), sigilo: '0', event: '-', label: 'Informação extraída do formulário preenchido pelo usuário' }]
        const prompt = getInternalPrompt(nextRequest.produto === P.DECISAO_VIABILIDADE_RECURSO_EXTRAORDINARIO ? 'decisao-viabilidade-recurso-extraordinario' : 'decisao-viabilidade-recurso-especial')
        const aiContentKey = `prompt: ${prompt}, data: ${calcMd5(data)}}`

        return <>
            <h2>{maiusculasEMinusculas(request.title)}</h2>
            <div className="mb-3">
                <div className="alert alert-success pt-4 pb-2">
                    <ol>
                        {aPedidos.map((pedido, i) =>
                            <li className={`mb-1 ${!pedido.dispositivo ? 'opacity-25' : ''}`} key={i}>
                                <span>{pedido.texto}</span>
                                <span> <b>{tiposDeDispositivo.find(o => o.id === pedido.dispositivo)?.name}</b></span>
                                {pedido.tema && <span> - {formatarTemaSelecionado(pedido.tema)}</span>}
                                {pedido.fundamentacoes && pedido.fundamentacoes.filter(f => f.selecionada).length > 0 && <span> - {pedido.fundamentacoes.filter(f => f.selecionada).map(f => f.texto).join(' - ')}</span>}
                                {pedido.fundamentacao && <span> - {pedido.fundamentacao}</span>}
                            </li>
                        )}
                    </ol>
                </div>
            </div>
            <div className="row h-print mb-3">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', false)} >
                        Alterar Fundamentações e Dispositivos
                    </Button>
                </div>
            </div>
            <h2>{nextRequest.produto === P.DECISAO_VIABILIDADE_RECURSO_EXTRAORDINARIO ? 'Decisão de Viabilidade de Recurso Extraordinário' : 'Decisão de Viabilidade de Recurso Especial'}</h2>
            <AiContent definition={prompt} data={data} key={aiContentKey} dossierCode={dossierCode} onBusy={onBusy} onReady={onReady} dadosDoProcesso={dadosDoProcesso} />
        </>
    }

    const disabledReason = ((): string => {
        const pedidos = Frm.get('pedidos')?.pedidos
        let enougth = false

        // varre todos os pedidos e verifica se algum tem decisão igual a SUSPENDER, NEGAR_SEGUIMENTO ou ENCAMINHAR_PARA_RETRATACAO
        for (let i = 0; i < pedidos.length; i++) {
            const pedido = pedidos[i]
            if (DISPOSITIVOS_COM_TEMA.includes(pedido.dispositivo)) {
                enougth = true
                if (!pedido.tema) {
                    return 'Selecione um tema para todos os pedidos que requerem.'
                }
            }
            // varre os argumentos do pedido e verifica se algum tem decisão igual a SUSPENDER, NEGAR_SEGUIMENTO ou ENCAMINHAR_PARA_RETRATACAO
            for (let j = 0; j < (pedido.argumentos || []).length; j++) {
                const argumento = pedido.argumentos[j]
                if (DISPOSITIVOS_COM_TEMA.includes(argumento.dispositivo)) {
                    enougth = true
                    if (!argumento.tema) {
                        return 'Selecione um tema para todos os argumentos que requerem.'
                    }
                }
                if (argumento.dispositivo === 'INADIMITIR' && !argumento.motivo) {
                    return 'Selecione um motivo de inadmissão para todos os argumentos que requerem.'
                }
            }
        }

        if (enougth) return ''

        // varre todos os pedidos e verifica se algum tem decisão não preenchida
        for (let i = 0; i < pedidos.length; i++) {
            const pedido = pedidos[i]
            if (!pedido.dispositivo) {
                return 'Selecione a decisão para todos os pedidos.'
            }
            // varre os argumentos do pedido e verifica se algum tem decisão não preenchida
            for (let j = 0; j < (pedido.argumentos || []).length; j++) {
                const argumento = pedido.argumentos[j]
                if (!argumento.dispositivo) {
                    return 'Selecione a decisão para todos os argumentos.'
                }
            }
        }

        return ''
    })()

    return <>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        {JSON.stringify(Frm.data)}
        <div className="alert alert-warning pt-2 pb-0 mb-0">
            {pedidos.pedidos.map((pedido, i) =>
                <div className="mb-3" key={i}>
                    <div className="row mt-1">
                        <div className="col col-12 col-sm-9"><span><strong>{i + 1}{')'}</strong></span>{` ${Frm.get(`pedidos.pedidos[${i}].texto`)}`}</div>
                        <Frm.Select label="Decisão" name={`pedidos.pedidos[${i}].dispositivo`} options={tiposDeDispositivo} width={'col-12 col-sm-3'} />
                    </div>
                    {/* <div className="row">
                        <Frm.TextArea label={`${i + 1}) Pedido`} name={`pedidos.pedidos[${i}].texto`} width={''} />
                    </div> */}
                    <div className="row mt-1 mb-3">
                        {/* <Frm.TextArea label="Fundamentação (opcional)" name={`pedidos.pedidos[${i}].fundamentacao`} width={'col-12 col-sm-8'} /> */}
                        {Frm.get(`pedidos.pedidos[${i}].dispositivo`) === 'INADIMITIR' && <Frm.Select label="Motivo" name={`pedidos.pedidos[${i}].motivo`} options={motivoDaInadimissao} width={'col-12'} />}
                        {DISPOSITIVOS_COM_TEMA.includes(Frm.get(`pedidos.pedidos[${i}].dispositivo`)) &&
                            <Frm.AsyncSelect<SemanticSearchResultItem>
                                label="Tema"
                                name={`pedidos.pedidos[${i}].tema`}
                                searchFn={semanticSearchDeTemas}
                                formatOption={formatarOpcaoTema}
                                formatSelected={formatarTemaSelecionado}
                                minSearchLength={1}
                                width={'col-12'}
                                explanation="Digite para buscar temas de repercussão geral ou recursos repetitivos"
                            />
                        }
                    </div>
                    {pedido.argumentos.map((argumento, j) =>
                        <div key={j} className="row mt-1">
                            <div className="col col-12 col-sm-8 offset-1"><span><strong>{i + 1}.{j + 1}{')'}</strong></span>{` ${Frm.get(`pedidos.pedidos[${i}].argumentos[${j}].texto`)}`}</div>
                            <Frm.Select label="Decisão" name={`pedidos.pedidos[${i}].argumentos[${j}].dispositivo`} options={tiposDeDispositivo} width={'col-12 col-sm-3'} />
                            <div className="col col-11 offset-1">
                                <div className="row mt-1 mb-3">
                                    {/* <Frm.TextArea label="Fundamentação (opcional)" name={`pedidos.pedidos[${i}].fundamentacao`} width={'col-12 col-sm-8'} /> */}
                                    {Frm.get(`pedidos.pedidos[${i}].argumentos[${j}].dispositivo`) === 'INADIMITIR' && <Frm.Select label="Motivo" name={`pedidos.pedidos[${i}].argumentos[${j}].motivo`} options={motivoDaInadimissao} width={'col-12'} />}
                                    {DISPOSITIVOS_COM_TEMA.includes(Frm.get(`pedidos.pedidos[${i}].argumentos[${j}].dispositivo`)) &&
                                        <Frm.AsyncSelect<SemanticSearchResultItem>
                                            label="Tema"
                                            name={`pedidos.pedidos[${i}].argumentos[${j}].tema`}
                                            searchFn={semanticSearchDeTemas}
                                            formatOption={formatarOpcaoTema}
                                            formatSelected={formatarTemaSelecionado}
                                            minSearchLength={1}
                                            width={'col-12'}
                                            explanation="Digite para buscar temas de repercussão geral ou recursos repetitivos"
                                        />
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        <span className="text-muted text-small">{disabledReason}</span>
        {Frm.get('pedidos')?.pedidos.length > 0 &&
            <div className="row h-print mb-3 mt-3">
                <div className="col">
                    <Button
                        className="float-end"
                        variant="primary"
                        onClick={() => Frm.set('pedidosAnalisados', true)}
                        disabled={!!disabledReason}
                    >
                        Gerar {nextRequest.produto === P.DECISAO_VIABILIDADE_RECURSO_EXTRAORDINARIO ? 'Decisão' : 'Decisão'}
                    </Button>
                </div>
            </div>
        }
    </>
}