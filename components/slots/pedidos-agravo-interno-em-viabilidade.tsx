'use client'

// Formulario para "Agravo Interno em decisao de viabilidade de recurso", analogo ao
// `pedidos-viabilidade-recurso.tsx`, mas com vocabulario de Decisao/Motivo proprio do
// agravo interno (sem temas de repercussao geral).
//
// Contrato de slugs (para os prompts da biblioteca remota, sincronizados via
// PROMPT_LIBRARIES). Os slugs derivam do `path:`/nome do arquivo (lib/sync/providers/shared.ts):
//   - Extracao (produz o JSON default do form): pedidos-agravo-interno-em-viabilidade-recurso
//   - Juizo (gera o JSON semente com dispositivo/motivo/fundamentos):
//       juizo-agravo-interno-em-viabilidade-recurso-especial
//       juizo-agravo-interno-em-viabilidade-recurso-extraordinario
//   - Decisao/voto (gera o texto final):
//       decisao-agravo-interno-em-viabilidade-recurso-especial
//       decisao-agravo-interno-em-viabilidade-recurso-extraordinario
//   - piece_strategy: agravo-interno-em-viabilidade-recurso-especial / -extraordinario
//   - group: decisao-de-viabilidade (GrupoDeSinteseMap.DECISAO_DE_VIABILIDADE)

import AiContent from "@/components/ai-content"
import { resolvePromptDefinition } from "@/lib/ai/prompt-actions"
import { ContentType, GeneratedContent, PromptDefinitionType } from "@/lib/ai/prompt-types"
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import { FormHelper } from "@/lib/ui/form-support"
import { calcMd5 } from "@/lib/utils/hash"
import devLog from "@/lib/utils/log"
import { maiusculasEMinusculas } from "@/lib/utils/utils"
import { useEffect, useState } from "react"
import { Button, Spinner } from "react-bootstrap"

// Dispositivos que exigem selecao de motivo
const DISPOSITIVOS_COM_MOTIVO = ['NAO_CONHECIDO', 'PROVIDO', 'DESPROVIDO']

interface MotivoOption {
    id: string
    name: string
    requerTexto?: boolean
}

// Motivos de "nao conhecimento" aplicaveis ao recurso como um todo (preliminar).
// Quando preenchido, sobrepoe os dispositivos por pedido/argumento.
const motivoNaoConhecimento = [
    { id: 'INTEMPESTIVIDADE', name: 'Intempestividade' },
    { id: 'NAO_CABIMENTO', name: 'Não cabimento do recurso' },
    { id: 'DEFICIENCIA_FUNDAMENTACAO', name: 'Deficiência da fundamentação' },
]

// Opcoes de decisao (dispositivo) por pedido/argumento
const tiposDeDispositivo = [
    { id: '', name: '' },
    { id: 'DESCONSIDERAR', name: 'Desconsiderar' },
    { id: 'NAO_CONHECIDO', name: 'Recurso não conhecido' },
    { id: 'PROVIDO', name: 'Recurso provido' },
    { id: 'DESPROVIDO', name: 'Recurso desprovido' },
]

// Motivos por dispositivo. `requerTexto` abre um campo livre de fundamentos.
const motivosPorDispositivo: MotivoOption[] = [
    // NAO_CONHECIDO
    { id: 'DEFICIENCIA_FUNDAMENTACAO', name: 'Deficiência na fundamentação' },
    { id: 'OUTROS_FUNDAMENTOS_NAO_CONHECIDO', name: 'Outros fundamentos', requerTexto: true },
    // PROVIDO
    { id: 'ACOLHE_FUNDAMENTOS_PARTE', name: 'Acolhe os fundamentos da parte' },
    { id: 'ACOLHE_E_ACRESCENTA', name: 'Acolhe e acrescenta outros fundamentos', requerTexto: true },
    { id: 'OUTROS_FUNDAMENTOS_PROVIDO', name: 'Outros fundamentos', requerTexto: true },
    // DESPROVIDO
    { id: 'MANTEM_FUNDAMENTOS_DECISAO', name: 'Mantém fundamentos da decisão' },
    { id: 'MANTEM_E_ACRESCENTA', name: 'Mantém e acrescenta novos fundamentos', requerTexto: true },
    { id: 'OUTROS_FUNDAMENTOS_DESPROVIDO', name: 'Outros fundamentos', requerTexto: true },
]

// Motivos que abrem o campo livre de fundamentos
const MOTIVOS_COM_FUNDAMENTOS = motivosPorDispositivo.filter(m => m.requerTexto).map(m => m.id)

const motivosParaDispositivo = (dispositivo: string): MotivoOption[] => {
    // Os conjuntos sao distintos por dispositivo; como os ids nao se repetem entre
    // os conjuntos, filtramos por prefixo derivado do dispositivo.
    const conjuntos: Record<string, MotivoOption[]> = {
        NAO_CONHECIDO: [
            motivosPorDispositivo.find(m => m.id === 'DEFICIENCIA_FUNDAMENTACAO')!,
            motivosPorDispositivo.find(m => m.id === 'OUTROS_FUNDAMENTOS_NAO_CONHECIDO')!,
        ],
        PROVIDO: [
            motivosPorDispositivo.find(m => m.id === 'ACOLHE_FUNDAMENTOS_PARTE')!,
            motivosPorDispositivo.find(m => m.id === 'ACOLHE_E_ACRESCENTA')!,
            motivosPorDispositivo.find(m => m.id === 'OUTROS_FUNDAMENTOS_PROVIDO')!,
        ],
        DESPROVIDO: [
            motivosPorDispositivo.find(m => m.id === 'MANTEM_FUNDAMENTOS_DECISAO')!,
            motivosPorDispositivo.find(m => m.id === 'MANTEM_E_ACRESCENTA')!,
            motivosPorDispositivo.find(m => m.id === 'OUTROS_FUNDAMENTOS_DESPROVIDO')!,
        ],
    }
    return conjuntos[dispositivo] || []
}

const requerFundamentos = (motivo: string[] | null | undefined): boolean => {
    return Array.isArray(motivo) && motivo.some(m => MOTIVOS_COM_FUNDAMENTOS.includes(m))
}

interface PedidosAgravoInternoEmViabilidadeProps {
    pedidos: { proximoPrompt: string; pedidos: any[] };
    request: GeneratedContent;
    nextRequest: GeneratedContent;
    Frm: FormHelper;
    dossierCode: string;
    onBusy?: () => void;
    onReady?: (content: ContentType) => void;
    dadosDoProcesso?: DadosDoProcessoType;
    recurso: "REsp" | "RE"
}

export const PedidosAgravoInternoEmViabilidadeRecursoEspecial = (props: PedidosAgravoInternoEmViabilidadeProps) => {
    return <PedidosAgravoInternoEmViabilidade {...props} recurso="REsp" />
}

export const PedidosAgravoInternoEmViabilidadeRecursoExtraordinario = (props: PedidosAgravoInternoEmViabilidadeProps) => {
    return <PedidosAgravoInternoEmViabilidade {...props} recurso="RE" />
}

const PedidosAgravoInternoEmViabilidade = ({ pedidos, request, nextRequest, Frm, dossierCode, onBusy, onReady, dadosDoProcesso, recurso }: PedidosAgravoInternoEmViabilidadeProps) => {
    const [resolvedDef, setResolvedDef] = useState<PromptDefinitionType | null>(null)
    const pedidosAnalisados = Frm.get('pedidosAnalisados')
    const slug = nextRequest.promptSlug

    useEffect(() => {
        if (pedidosAnalisados) {
            resolvePromptDefinition(slug).then(setResolvedDef)
        }
    }, [pedidosAnalisados, slug])

    const limparCamposDesnecessarios = () => {
        const pedidos = Frm.get('pedidos').pedidos
        let atualizados = false

        // Limpar campos "dispositivo" dos pedidos quando ha motivoGeral de nao conhecimento
        // preenchido, pois nesse caso o motivo geral e suficiente para justificar o nao
        // conhecimento do recurso, e os dispositivos dos pedidos ficam irrelevantes.
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

        // Limpar campos de motivo e fundamentos para pedidos que nao requerem
        const pedidosLimpos = pedidos.map((pedido: any) => {
            let atualizado = false
            if (!DISPOSITIVOS_COM_MOTIVO.includes(pedido.dispositivo) && Array.isArray(pedido.motivo) && pedido.motivo.length > 0) {
                pedido.motivo = null
                atualizado = true
            }
            if (!requerFundamentos(pedido.motivo) && pedido.fundamentos) {
                pedido.fundamentos = null
                atualizado = true
            }
            const argumentos = pedido.argumentos.map((argumento: any) => {
                let argAtualizado = false
                if (!DISPOSITIVOS_COM_MOTIVO.includes(argumento.dispositivo) && Array.isArray(argumento.motivo) && argumento.motivo.length > 0) {
                    argumento.motivo = null
                    argAtualizado = true
                }
                if (!requerFundamentos(argumento.motivo) && argumento.fundamentos) {
                    argumento.fundamentos = null
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

        if (atualizados) {
            Frm.set('pedidos.pedidos', pedidosLimpos)
        }

        return atualizados
    }

    useEffect(() => {
        devLog('Verificando pedidos para limpeza...')
        if (limparCamposDesnecessarios()) {
            devLog('Campos desnecessários limpos. Pedidos atualizados:', Frm.get('pedidos').pedidos)
        }
    }, [Frm.data])

    if (pedidosAnalisados) {
        if (!resolvedDef) return <div className="text-center my-3"><Spinner variant="secondary" /></div>
        const frmData = Frm.get('pedidos')
        const aPedidos = [...frmData.pedidos].filter(p => p.dispositivo && p.dispositivo !== 'DESCONSIDERAR')
        const data = { ...request.data }
        data.textos = [...request.data.textos, { numeroDoProcesso: data?.numeroDoProcesso || '', slug: 'pedidos', descr: 'Pedidos', texto: JSON.stringify({ ...frmData, pedidos: aPedidos }), sigilo: '0', event: '-', label: 'Informação extraída do formulário preenchido pelo usuário' }]
        const aiContentKey = `prompt: ${slug}, data: ${calcMd5(data)}}`

        return <>
            <h2>{maiusculasEMinusculas(request.title)}</h2>
            <div className="mb-3">
                <div className="alert alert-success pt-4 pb-2">
                    {frmData.motivoGeral && frmData.motivoGeral.length > 0 ? (
                        <p>Motivo de Não Conhecimento: {frmData.motivoGeral.map(m => motivoNaoConhecimento.find(o => o.id === m)?.name || m).join(', ')}</p>
                    ) : <ol>
                        {aPedidos.map((pedido, i) =>
                            <li className={`mb-1 ${!pedido.dispositivo ? 'opacity-25' : ''}`} key={i}>
                                <span>{pedido.texto}</span>
                                <span> <b>{tiposDeDispositivo.find(o => o.id === pedido.dispositivo)?.name}</b></span>
                                {pedido.motivo && <strong> - {pedido.motivo.map((m: string) => motivosPorDispositivo.find(o => o.id === m)?.name || m).join(', ')}</strong>}
                                {pedido.fundamentos && <div className="ms-3 text-muted"><em>Fundamentos:</em> {pedido.fundamentos}</div>}
                                <ul>
                                    {pedido.argumentos.map((argumento: any, j: number) =>
                                        <li key={j} className={`${!argumento.dispositivo ? 'opacity-25' : ''}`}>
                                            <span>{argumento.texto}</span>
                                            <span> <b>{tiposDeDispositivo.find(o => o.id === argumento.dispositivo)?.name}</b></span>
                                            {argumento.motivo && <strong> - {argumento.motivo.map((m: string) => motivosPorDispositivo.find(o => o.id === m)?.name || m).join(', ')}</strong>}
                                            {argumento.fundamentos && <div className="ms-3 text-muted"><em>Fundamentos:</em> {argumento.fundamentos}</div>}
                                        </li>
                                    )}
                                </ul>
                            </li>
                        )}
                    </ol>}

                    <p><strong>Comandos Adicionais:</strong> {frmData.Tg_ComandosAdicionais}</p>
                </div>
            </div>
            <div className="row h-print mb-3">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', false)} >
                        Alterar Decisões e Motivos
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

        if (data.motivoGeral && data.motivoGeral.length > 0) {
            return ''
        }

        for (let i = 0; i < pedidos.length; i++) {
            const pedido = pedidos[i]
            if (DISPOSITIVOS_COM_MOTIVO.includes(pedido.dispositivo) && (!pedido.motivo || pedido.motivo.length === 0)) {
                return 'Selecione ao menos um motivo para todos os pedidos/argumentos com decisão Não conhecido / Provido / Desprovido.'
            }
            if (requerFundamentos(pedido.motivo) && !pedido.fundamentos) {
                return 'Preencha os fundamentos para os motivos que exigem detalhamento.'
            }
            for (let j = 0; j < (pedido.argumentos || []).length; j++) {
                const argumento = pedido.argumentos[j]
                if (DISPOSITIVOS_COM_MOTIVO.includes(argumento.dispositivo) && (!argumento.motivo || argumento.motivo.length === 0)) {
                    return 'Selecione ao menos um motivo para todos os pedidos/argumentos com decisão Não conhecido / Provido / Desprovido.'
                }
                if (requerFundamentos(argumento.motivo) && !argumento.fundamentos) {
                    return 'Preencha os fundamentos para os motivos que exigem detalhamento.'
                }
            }
        }

        // Verifica se algum pedido/argumento tem decisao nao preenchida
        for (let i = 0; i < pedidos.length; i++) {
            const pedido = pedidos[i]
            if (!pedido.dispositivo) {
                return 'Selecione a decisão para todos os pedidos.'
            }
            for (let j = 0; j < (pedido.argumentos || []).length; j++) {
                const argumento = pedido.argumentos[j]
                if (!argumento.dispositivo) {
                    return 'Selecione a decisão para todos os argumentos.'
                }
            }
        }

        return ''
    })()

    const renderMotivoEFundamentos = (baseName: string, dispositivo: string) => {
        const motivos = motivosParaDispositivo(dispositivo)
        if (!DISPOSITIVOS_COM_MOTIVO.includes(dispositivo)) return null
        const motivoValue = Frm.get(`${baseName}.motivo`)
        return <>
            {motivos.length > 0 && <Frm.MultiSelect label="Motivo" name={`${baseName}.motivo`} options={motivos} width={'col-12'} displayCount={1} />}
            {requerFundamentos(motivoValue) && <Frm.TextArea label="Fundamentos" name={`${baseName}.fundamentos`} width={'col-12'} maxRows={4} />}
        </>
    }

    return <>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        <div className="alert alert-warning pt-2 pb-0 mb-0">
            <h5 className="mt-1">Verificação Preliminar (Motivo do não conhecimento)</h5>
            <div className="mb-3">
                <Frm.MultiSelect label="Motivo de Não Conhecimento" name={`pedidos.motivoGeral`} options={motivoNaoConhecimento} width={'col-12'} displayCount={1} />
            </div>
            <div className={`${Frm.get('pedidos.motivoGeral') && Frm.get('pedidos.motivoGeral').length > 0 ? 'd-none' : ''}`}>
                <h5 className="mt-3">Análise dos Pedidos e Argumentos</h5>
                {pedidos.pedidos.map((pedido, i) =>
                    <div className="mb-3" key={i}>
                        <div className="row mt-1">
                            <div className="col col-12 col-sm-9"><span><strong>{i + 1}{')'}</strong></span>{` ${Frm.get(`pedidos.pedidos[${i}].texto`)}`}</div>
                            <Frm.Select label="Decisão" name={`pedidos.pedidos[${i}].dispositivo`} options={tiposDeDispositivo} width={'col-12 col-sm-3'} />
                        </div>
                        <div className="row mt-1 mb-3">
                            {renderMotivoEFundamentos(`pedidos.pedidos[${i}]`, Frm.get(`pedidos.pedidos[${i}].dispositivo`))}
                        </div>
                        {pedido.argumentos.map((argumento: any, j: number) =>
                            <div key={j} className="row mt-1">
                                <div className="col col-12 col-sm-8 offset-1"><span><strong>{i + 1}.{j + 1}{')'}</strong></span>{` ${Frm.get(`pedidos.pedidos[${i}].argumentos[${j}].texto`)}`}</div>
                                <Frm.Select label="Decisão" name={`pedidos.pedidos[${i}].argumentos[${j}].dispositivo`} options={tiposDeDispositivo} width={'col-12 col-sm-3'} />
                                <div className="col col-11 offset-1">
                                    <div className="row mt-1 mb-3">
                                        {renderMotivoEFundamentos(`pedidos.pedidos[${i}].argumentos[${j}]`, Frm.get(`pedidos.pedidos[${i}].argumentos[${j}].dispositivo`))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="row mb-3">
                    <Frm.TextArea label="Comandos adicionais para a redação da decisão (opcional)" name={`pedidos.Tg_ComandosAdicionais`} width={''} maxRows={4} />
                </div>
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
                        Gerar Voto
                    </Button>
                </div>
            </div>
        }
    </>
}
