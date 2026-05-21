'use client'

import AiContent from "@/components/ai-content"
import { resolvePromptDefinition } from "@/lib/ai/prompt-actions"
import { ContentType, GeneratedContent, PromptDefinitionType } from "@/lib/ai/prompt-types"
import { PangeaResultadoItem, PangeaSearchRawResponse } from "@/lib/ai/tools-pangea"
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
import devLog from "@/lib/utils/log"
import { labelToName, maiusculasEMinusculas } from "@/lib/utils/utils"
import { useEffect, useState } from "react"
import { Button, Spinner } from "react-bootstrap"

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

export const PedidosViabilidadeRecursoEspecial = ({ pedidos, request, nextRequest, Frm, dossierCode, onBusy, onReady, dadosDoProcesso }: PedidosViabilidadeRecursoProps) => {
    const [resolvedDef, setResolvedDef] = useState<PromptDefinitionType | null>(null)
    const pedidosAnalisados = Frm.get('pedidosAnalisados')
    const slug = nextRequest.promptSlug

    useEffect(() => {
        if (pedidosAnalisados) {
            resolvePromptDefinition(slug).then(setResolvedDef)
        }
    }, [pedidosAnalisados, slug])

    const tiposDeDispositivo = [
        { id: '', name: '' },
        { id: 'SUSPENDER', name: 'Suspender' }, // tema
        { id: 'NEGAR_SEGUIMENTO', name: 'Negar Seguimento' }, // tema
        { id: 'ENCAMINHAR_PARA_RETRATACAO', name: 'Encaminhar para Retratação' }, // tema
        { id: 'ADMITIR', name: 'Admitir' },
        { id: 'INADIMITIR', name: 'Inadmitir' }, // motivoDaInadimissao
        { id: 'RECURSO_PREJUDICADO', name: 'Recurso Prejudicado' },
        { id: 'DESCONSIDERAR', name: 'Desconsiderar' },
    ]

    const motivoGeralDeInadmissao = [
        { id: 'DESERCAO', name: 'Deserção' },
        { id: 'IRREGULARIDADE_REPRESENTACAO', name: 'Irregularidade da Representação Processual' },
        { id: 'ILEGITIMIDADE', name: 'Ilegitimidade Recursal' },
        { id: 'INTEMPESTIVIDADE', name: 'Intempestividade' },
        { id: 'FALTA_DE_INTERESSE_RECURSAL', name: 'Falta de Interesse Recursal' },
        { id: 'NAO_EXAURIMENTO', name: 'Não Exaurimento das Instâncias Ordinárias - Súmula 281/STF' },
    ]

    const motivoDaInadimissao = [
        { id: 'AUSENCIA_PREQUESTIONAMENTO', name: 'Ausência de Prequestionamento - Súmulas 282/STF, 356/STF e Súmula 211/STJ' },
        { id: 'FUNDAMENTO_CONSTITUCIONAL_AUTONOMO', name: 'Fundamento constitucional autônomo não impugnado - Súmula 126/STJ' },
        { id: 'DEFICIENCIA_FUNDAMENTACAO', name: 'Deficiência de Fundamentação - Súmula 284/STF' },
        { id: 'FUNDAMENTO_AUTONOMO', name: 'Fundamento autônomo suficiente não impugnado - Súmula 283/STF' },
        { id: 'FALTA_DE_COTEJO_ANALITICO', name: 'Falta de cotejo analítico - divergência jurisprudencial - alínea \'c\'' },
        { id: 'AUSENCIA_COMPROVACAO_DISSIDIO', name: 'Ausência de comprovação do dissídio jurisprudencial' },
        { id: 'FATICA_PROBATORIA', name: 'Reexame Fático-Probatório - Súmula 7/STJ' },
        { id: 'CONFORMIDADE_JURISPRUDENCIA', name: 'Conformidade com a Jurisprudência do STJ - Súmula 83/STJ' },
        { id: 'CLAUSULA_CONTRATUAL', name: 'Interpretação de cláusula contratual - Súmula 5/STJ' },
        { id: 'ATOS_NORMATIVOS_INFRALEGAIS', name: 'Atos Normativos Infralegais' },
        { id: 'DIREITO_LOCAL', name: 'Direito Local - Súmula 280/STF' },
        { id: 'QUESTAO_EXCLUSIVAMENTE_CONSTITUCIONAL', name: 'Questão Exclusivamente Constitucional' },
    ]
    // if (nextRequest?.promptSlug === 'decisao_viabilidade_recurso_especial')
    //     motivoDaInadimissao.push({ id: 'MATERIA_DE_INDOLE_CONSTITUCIONAL', name: 'Matéria de Índole Constitucional' })

    const limparCamposDesnecessarios = () => {
        const pedidos = Frm.get('pedidos').pedidos
        let atualizados = false

        // Limpar campos "dispositivo" dos pedidos quando há motivoGeral de inadmissão preenchido, pois 
        // nesse caso o motivo geral de inadmissão é suficiente para justificar a inadmissão do recurso, 
        // e os dispositivos dos pedidos ficam irrelevantes
        const motivoGeral = Frm.get('pedidos').motivoGeral
        if (motivoGeral && motivoGeral.length > 0) {
            const pedidosLimpos = pedidos.map((pedido: any) => {
                if (pedido.dispositivo) {
                    pedido.dispositivo = null
                    atualizados = true
                }
                const argumentos = pedido.argumentos.map((argumento: any) => {
                    if (argumento.dispositivo) {
                        argumento.dispositivo = null
                        atualizados = true
                    }
                    return argumento
                })
                return { ...pedido, argumentos }
            })
        }

        // Limpar campos de tema e motivo de inadmissão para pedidos que não requerem
        const pedidosLimpos = pedidos.map((pedido: any) => {
            let atualizado = false
            if (!DISPOSITIVOS_COM_TEMA.includes(pedido.dispositivo) && pedido.tema) {
                pedido.tema = null
                atualizado = true
            }
            if (pedido.dispositivo !== 'INADIMITIR' && pedido.motivo) {
                pedido.motivo = null
                atualizado = true
            }
            const argumentos = pedido.argumentos.map((argumento: any) => {
                let argAtualizado = false
                if (!DISPOSITIVOS_COM_TEMA.includes(argumento.dispositivo) && argumento.tema) {
                    argumento.tema = null
                    argAtualizado = true
                }
                if (argumento.dispositivo !== 'INADIMITIR' && argumento.motivo) {
                    argumento.motivo = null
                    argAtualizado = true
                }
                if (argAtualizado) atualizado = true
                return argumento
            })
            if (atualizado) {
                return { ...pedido, argumentos }
            }
            return pedido
        })

        // Se houve alguma atualização, salvar os pedidos limpos no formulário
        if (atualizados) {
            Frm.set('pedidos.pedidos', pedidosLimpos)
        }

        return atualizados
    }

    // pedidos com tema.id mas sem tema.questao, obter o tema completo via busca semântica pela id
    useEffect(() => {
        console.log('Verificando pedidos para completar temas via busca semântica...')
        const aPedidos = Frm.get('pedidos').pedidos
        if (!aPedidos || aPedidos.length === 0) return

        if (limparCamposDesnecessarios()) {
            devLog('Campos desnecessários limpos. Pedidos atualizados:', Frm.get('pedidos').pedidos)
            return
        }

        const buscarTemasCompletos = async () => {
            const promessas: Promise<any>[] = []

            aPedidos.forEach((pedido: any, indexPedido: number) => {
                if (pedido.tema && typeof pedido.tema === 'string') {
                    const idTema = pedido.tema
                    const p = semanticSearchDeTemas(idTema)
                        .then(temas => ({ tipo: 'pedido', indexPedido, temaCompleto: temas.find(t => t.id === idTema) }))
                        .catch(error => { console.error('Erro ao buscar tema completo:', error); return null })
                    promessas.push(p)
                }

                if (pedido.argumentos && Array.isArray(pedido.argumentos)) {
                    pedido.argumentos.forEach((argumento: any, indexArgumento: number) => {
                        if (argumento.tema && typeof argumento.tema === 'string') {
                            const idTema = argumento.tema
                            const p = semanticSearchDeTemas(idTema)
                                .then(temas => ({ tipo: 'argumento', indexPedido, indexArgumento, temaCompleto: temas.find(t => t.id === idTema) }))
                                .catch(error => { console.error('Erro ao buscar tema completo:', error); return null })
                            promessas.push(p)
                        }
                    })
                }
            })

            const resultados = await Promise.all(promessas)
            const pedidosAtualizados = [...aPedidos]

            resultados.forEach(resultado => {
                if (resultado && resultado.temaCompleto) {
                    if (resultado.tipo === 'pedido') {
                        pedidosAtualizados[resultado.indexPedido].tema = resultado.temaCompleto
                    } else if (resultado.tipo === 'argumento') {
                        pedidosAtualizados[resultado.indexPedido].argumentos[resultado.indexArgumento].tema = resultado.temaCompleto
                    }
                }
            })

            console.log('Pedidos atualizados com temas completos:', pedidosAtualizados)

            Frm.set('pedidos.pedidos', pedidosAtualizados)
        }

        buscarTemasCompletos()
    }, [Frm, pedidos])

    useEffect(() => {
        console.log('Verificando pedidos para limpeza...')
        if (limparCamposDesnecessarios()) {
            devLog('Campos desnecessários limpos. Pedidos atualizados:', Frm.get('pedidos').pedidos)
            return
        }
    }, [Frm.data])

    if (pedidosAnalisados) {
        if (!resolvedDef) return <div className="text-center my-3"><Spinner variant="secondary" /></div>
        const frmData = Frm.get('pedidos')
        const aPedidos = [...frmData.pedidos].filter(p => p.dispositivo && p.dispositivo !== 'DESCONSIDERAR')
        const data = { ...request.data }
        data.textos = [...request.data.textos, { numeroDoProcesso: data?.numeroDoProcesso || '', slug: 'pedidos', descr: 'Pedidos', texto: JSON.stringify(aPedidos), sigilo: '0', event: '-', label: 'Informação extraída do formulário preenchido pelo usuário' }]
        const aiContentKey = `prompt: ${slug}, data: ${calcMd5(data)}}`

        return <>
            <h2>{maiusculasEMinusculas(request.title)}</h2>
            <div className="mb-3">
                <div className="alert alert-success pt-4 pb-2">
                    {frmData.motivoGeral && frmData.motivoGeral.length > 0 ? (
                        <p>Motivo Geral de Inadmissão: {frmData.motivoGeral.join(', ')}</p>
                    ) : <ol>
                        {aPedidos.map((pedido, i) =>
                            <li className={`mb-1 ${!pedido.dispositivo ? 'opacity-25' : ''}`} key={i}>
                                <span>{pedido.texto}</span>
                                <span> <b>{tiposDeDispositivo.find(o => o.id === pedido.dispositivo)?.name}</b></span>
                                {pedido.tema && <strong> - {formatarTemaSelecionado(pedido.tema)}</strong>}
                                {pedido.motivo && <strong> - {pedido.motivo.map(m => motivoDaInadimissao.find(o => o.id === m)?.name).join(', ')}</strong>}
                                <ul>
                                    {pedido.argumentos.map((argumento, j) =>
                                        <li key={j} className={`${!argumento.dispositivo ? 'opacity-25' : ''}`}>
                                            <span>{argumento.texto}</span>
                                            <span> <b>{tiposDeDispositivo.find(o => o.id === argumento.dispositivo)?.name}</b></span>
                                            {argumento.tema && <strong> - {formatarTemaSelecionado(argumento.tema)}</strong>}
                                            {argumento.motivo && <strong> - {argumento.motivo.map(m => motivoDaInadimissao.find(o => o.id === m)?.name).join(', ')}</strong>}
                                        </li>
                                    )}
                                </ul>
                            </li>
                        )}
                    </ol>}
                </div>
            </div>
            <div className="row h-print mb-3">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', false)} >
                        Alterar Fundamentações e Dispositivos
                    </Button>
                </div>
            </div>
            <h2>{nextRequest.title}</h2>
            <AiContent definition={resolvedDef} data={data} key={aiContentKey} dossierCode={dossierCode} onBusy={onBusy} onReady={onReady} dadosDoProcesso={dadosDoProcesso} />
        </>
    }

    const disabledReason = ((): string => {
        const data = Frm.get('pedidos')
        const pedidos = data?.pedidos
        let enougth = false

        if (data.motivoGeral && data.motivoGeral.length > 0) {
            return ''
        }

        // varre todos os pedidos e verifica se algum tem decisão igual a SUSPENDER, NEGAR_SEGUIMENTO ou ENCAMINHAR_PARA_RETRATACAO
        for (let i = 0; i < pedidos.length; i++) {
            const pedido = pedidos[i]
            if (DISPOSITIVOS_COM_TEMA.includes(pedido.dispositivo)) {
                enougth = true
                if (!pedido.tema) {
                    return 'Selecione um tema para todos os pedidos que requerem.'
                }
            }
            if (pedido.dispositivo === 'INADIMITIR' && (!pedido.motivo || pedido.motivo.length === 0)) {
                return 'Selecione um motivo de inadmissão para todos os pedidos que requerem.'
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
                if (argumento.dispositivo === 'INADIMITIR' && (!argumento.motivo || argumento.motivo.length === 0)) {
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
        <div className="alert alert-warning pt-2 pb-0 mb-0">
            <h5 className="mt-1">Verificação Preliminar</h5>
            <div className="mb-3">
                <Frm.MultiSelect label="Motivo de Inadmissão" name={`pedidos.motivoGeral`} options={motivoGeralDeInadmissao} width={'col-12'} displayCount={1} />
            </div>
            <div className={`${Frm.get('pedidos.motivoGeral') && Frm.get('pedidos.motivoGeral').length > 0 ? 'd-none' : ''}`}>
                <h5 className="mt-3">Viabilidade dos Pedidos e Argumentos</h5>
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
                            {Frm.get(`pedidos.pedidos[${i}].dispositivo`) === 'INADIMITIR' && <Frm.MultiSelect label="Motivo" name={`pedidos.pedidos[${i}].motivo`} options={motivoDaInadimissao} width={'col-12'} displayCount={1} />}
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
                                        {Frm.get(`pedidos.pedidos[${i}].argumentos[${j}].dispositivo`) === 'INADIMITIR' && <Frm.MultiSelect label="Motivo" name={`pedidos.pedidos[${i}].argumentos[${j}].motivo`} options={motivoDaInadimissao} width={'col-12'} />}
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
                        Gerar Decisão
                    </Button>
                </div>
            </div>
        }
    </>
}