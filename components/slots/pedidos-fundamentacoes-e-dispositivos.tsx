'use client'

import { useEffect, useState } from "react"
import AiContent from "@/components/ai-content"
import { resolvePromptDefinition } from "@/lib/ai/prompt-actions"
import { ContentType, GeneratedContent, PromptDefinitionType } from "@/lib/ai/prompt-types"
import { DadosDoProcessoType } from "@/lib/proc/process-types"
import { FormHelper } from "@/lib/ui/form-support"
import { calcMd5 } from "@/lib/utils/hash"
import { labelToName, maiusculasEMinusculas } from "@/lib/utils/utils"
import { Button, Spinner } from "react-bootstrap"

interface PedidosFundamentacoesEDispositivosProps {
    pedidos: { proximoPrompt: string; pedidos: any[] };
    request: GeneratedContent;
    nextRequest: GeneratedContent;
    Frm: FormHelper;
    dossierCode: string;
    onBusy?: () => void;
    onReady?: (content: ContentType) => void;
    dadosDoProcesso?: DadosDoProcessoType;
}

export const PedidosFundamentacoesEDispositivos = ({ pedidos, request, nextRequest, Frm, dossierCode, onBusy, onReady, dadosDoProcesso }: PedidosFundamentacoesEDispositivosProps) => {
    const [resolvedDef, setResolvedDef] = useState<PromptDefinitionType | null>(null)
    const pedidosAnalisados = Frm.get('pedidosAnalisados')
    const slug = nextRequest.promptSlug

    useEffect(() => {
        if (pedidosAnalisados) {
            resolvePromptDefinition(slug).then(setResolvedDef)
        }
    }, [pedidosAnalisados, slug])

    const tiposDeLiminar = [
        { id: 'NAO', name: 'Não' },
        { id: 'SIM', name: 'Sim' },
    ]
    const tiposDePedido = [
        { id: 'CONDENAR_A_PAGAR', name: 'Condenar a Pagar' },
        { id: 'CONDENAR_A_FAZER', name: 'Condenar a Fazer' },
        { id: 'CONDENAR_A_DEIXAR_DE_FAZER', name: 'Condenar a Deixar de Fazer' },
        { id: 'CONSTITUIR_RELACAO_JURIDICA', name: 'Constituir Relação Jurídica' },
        { id: 'ANULAR_RELACAO_JURIDICA', name: 'Anular Relação Jurídica' },
        { id: 'DECLARAR_EXISTENCIA_DE_FATO', name: 'Declarar Existência de Fato' },
        { id: 'DECLARAR_INEXISTENCIA_DE_FATO', name: 'Declarar Inexistência de Fato' },
    ]
    const tiposDeVerba = [
        { id: 'SALARIO', name: 'Salário' },
        { id: 'DANO_MORAL', name: 'Dano Moral' },
        { id: 'OUTRA', name: 'Outra' },
        { id: 'NENHUMA', name: 'Nenhuma' },
    ]
    const tiposDeDispositivo = [
        { id: '', name: '' },
        { id: 'DEFERIR', name: 'Deferir' },
        { id: 'DEFERIR_PARCIALMENTE', name: 'Deferir Parcialmente' },
        { id: 'INDEFERIR', name: 'Indeferir' },
        { id: 'DESCONSIDERAR', name: 'Desconsiderar' },
    ]

    if (pedidosAnalisados) {
        if (!resolvedDef) return <div className="text-center my-3"><Spinner variant="secondary" /></div>
        const aPedidos = [...Frm.get('pedidos').pedidos].filter(p => p.dispositivo && p.dispositivo !== 'DESCONSIDERAR')
        const data = { ...request.data }
        data.textos = [...request.data.textos, { numeroDoProcesso: data?.numeroDoProcesso || '', slug: 'pedidos', descr: 'Pedidos', texto: JSON.stringify(aPedidos), sigilo: '0' }]

        const aiContentKey = `prompt: 'sentenca', data: ${calcMd5(data)}}`

        return <>
            <h2>{maiusculasEMinusculas(request.title)}</h2>
            <div className="mb-4">
                <div className="alert alert-success pt-4 pb-2">
                    <ol>
                        {aPedidos.map((pedido, i) =>
                            <li className={`mb-1 ${!pedido.dispositivo ? 'opacity-25' : ''}`} key={i}>
                                <span>{pedido.liminar === 'SIM' ? <span><b><u>Liminar</u></b> - </span> : ''}</span>
                                <span>{tiposDePedido.find(o => o.id === pedido.tipoDePedido)?.name} - </span>
                                {pedido.verba !== 'NENHUMA' && <>
                                    <span>{tiposDeVerba.find(o => o.id === pedido.verba)?.name} - </span>
                                    <span>{pedido.valor} - </span></>}
                                <span>{pedido.texto}</span>
                                <span> <b>{tiposDeDispositivo.find(o => o.id === pedido.dispositivo)?.name}</b></span>
                                {pedido.fundamentacoes && pedido.fundamentacoes.filter(f => f.selecionada).length > 0 && <span> - {pedido.fundamentacoes.filter(f => f.selecionada).map(f => f.texto).join(' - ')}</span>}
                                {pedido.fundamentacao && <span> - {pedido.fundamentacao}</span>}
                            </li>
                        )}
                    </ol>
                </div>
            </div>
            <div className="row h-print">
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

    return <>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        <div className="alert alert-warning pt-2 pb-0">
            {pedidos.pedidos.map((pedido, i) =>
                <div className="mb-3" key={i}>
                    {false && <div className="row">
                        <Frm.Select label="Liminar" name={`pedidos.pedidos[${i}].liminar`} options={tiposDeLiminar} width={2} />
                        <Frm.Select label="Tipo de Pedido" name={`pedidos.pedidos[${i}].tipoDePedido`} options={tiposDePedido} width={2} />
                        <Frm.Select label="Tipo de Verba" name={`pedidos.pedidos[${i}].verba`} options={tiposDeVerba} width={2} />
                        {Frm.get(`pedidos.pedidos[${i}].verba`) !== 'NENHUMA' && <Frm.Input label="Valor" name={`pedidos.pedidos[${i}].valor`} width={2} />}
                    </div>}
                    <div className="row mt-1">
                        <div className="col"><span><strong>{i + 1})</strong></span>{` ${Frm.get(`pedidos.pedidos[${i}].texto`)}`}</div>
                    </div>
                    {/* <div className="row">
                        <Frm.TextArea label={`${i + 1}) Pedido`} name={`pedidos.pedidos[${i}].texto`} width={''} />
                    </div> */}
                    {pedidos.pedidos[i]?.fundamentacoes?.length > 0 && <div className="row mt-1">
                        <div className="col-6">
                            <Frm.CheckBoxes label="Sugestões de fundamentações pró autor" labelsAndNames={pedidos.pedidos[i].fundamentacoes.map((p, idx) => (p.tipo === 'PROCEDENTE' ? { label: p.texto, name: `pedidos.pedidos[${i}].fundamentacoes[${idx}].selecionada` } : null))} onClick={(label, name, checked) => { if (checked) Frm.set(`pedidos.pedidos[${i}].dispositivo`, 'PROCEDENTE') }} width={12} />
                        </div>
                        <div className="col-6">
                            <Frm.CheckBoxes label="Sugestões de fundamentações pró réu" labelsAndNames={pedidos.pedidos[i].fundamentacoes.map((p, idx) => (p.tipo === 'IMPROCEDENTE' ? { label: p.texto, name: `pedidos.pedidos[${i}].fundamentacoes[${idx}].selecionada` } : null))} onClick={(label, name, checked) => { if (checked) Frm.set(`pedidos.pedidos[${i}].dispositivo`, 'IMPROCEDENTE') }} width={12} />
                        </div>
                    </div>}
                    <div className="row mt-1">
                        <Frm.TextArea label="Fundamentação (opcional)" name={`pedidos.pedidos[${i}].fundamentacao`} width={'col-12 col-sm-8'} />
                        <Frm.Select label="Comando" name={`pedidos.pedidos[${i}].dispositivo`} options={tiposDeDispositivo} width={'col-12 col-sm-4'} />
                    </div>
                </div>
            )}
        </div>
        {Frm.get('pedidos')?.pedidos.length > 0 &&
            <div className="row h-print mb-3">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', true)} disabled={Frm.get('pedidos')?.pedidos?.some(p => !p.dispositivo)}>
                        Gerar {nextRequest.title}
                    </Button>
                </div>
            </div>
        }
    </>
}