'use client'

import AiContent from "@/components/ai-content"
import { getInternalPrompt } from "@/lib/ai/prompt"
import { GeneratedContent } from "@/lib/ai/prompt-types"
import { P } from "@/lib/proc/combinacoes"
import { FormHelper } from "@/lib/ui/form-support"
import { calcMd5 } from "@/lib/utils/hash"
import { labelToName, maiusculasEMinusculas } from "@/lib/utils/utils"
import { Button } from "react-bootstrap"

export const PedidosFundamentacoesEDispositivos = ({ pedidos, request, nextRequest, Frm, dossierCode }: { pedidos: { proximoPrompt: string, pedidos: any[] }, request: GeneratedContent, nextRequest: GeneratedContent, Frm: FormHelper, dossierCode: string }) => {
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

    const pedidosAnalisados = Frm.get('pedidosAnalisados')
    if (pedidosAnalisados) {
        // const pedidos = [...Frm.get('pedidos')].filter(p => p.dispositivo).map(p => ({ ...p, fundamentacoes: [...p.fundamentacoes.filter(f => f.selecionada).map(f => f.texto)] }))
        // const proximoPrompt = Frm.get('pedidos').proximoPrompt || 'SENTENCA'
        const aPedidos = [...Frm.get('pedidos').pedidos].filter(p => p.dispositivo && p.dispositivo !== 'DESCONSIDERAR')
    const data = { ...request.data }
    data.textos = [...request.data.textos, { numeroDoProcesso: data?.numeroDoProcesso || '', slug: 'pedidos', descr: 'Pedidos', texto: JSON.stringify(aPedidos), sigilo: '0' }]

        const prompt = getInternalPrompt(nextRequest.produto === P.VOTO ? 'voto' : 'sentenca')

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
            <h2>{nextRequest.produto === P.VOTO ? 'Voto' : 'Sentença'}</h2>
            <AiContent definition={prompt} data={data} key={`prompt: 'sentenca', data: ${calcMd5(data)}`} dossierCode={dossierCode} />
        </>
    }

    return <>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        <div className="alert alert-warning pt-2 pb-3">
            {pedidos.pedidos.map((pedido, i) =>
                <div className="mb-4" key={i}>
                    {false && <div className="row">
                        <Frm.Select label="Liminar" name={`pedidos.pedidos[${i}].liminar`} options={tiposDeLiminar} width={2} />
                        <Frm.Select label="Tipo de Pedido" name={`pedidos.pedidos[${i}].tipoDePedido`} options={tiposDePedido} width={2} />
                        <Frm.Select label="Tipo de Verba" name={`pedidos.pedidos[${i}].verba`} options={tiposDeVerba} width={2} />
                        {Frm.get(`pedidos.pedidos[${i}].verba`) !== 'NENHUMA' && <Frm.Input label="Valor" name={`pedidos.pedidos[${i}].valor`} width={2} />}
                    </div>}
                    <div className="row mt-1">
                        <Frm.TextArea label={`${i + 1}) Pedido`} name={`pedidos.pedidos[${i}].texto`} width={''} />
                    </div>
                    {pedidos.pedidos[i]?.fundamentacoes?.length > 0 && <div className="row mt-1">
                        <div className="col-6">
                            <Frm.CheckBoxes label="Sugestões de fundamentações pró autor" labelsAndNames={pedidos.pedidos[i].fundamentacoes.map((p, idx) => (p.tipo === 'PROCEDENTE' ? { label: p.texto, name: `pedidos.pedidos[${i}].fundamentacoes[${idx}].selecionada` } : null))} onClick={(label, name, checked) => { if (checked) Frm.set(`pedidos.pedidos[${i}].dispositivo`, 'PROCEDENTE') }} width={12} />
                        </div>
                        <div className="col-6">
                            <Frm.CheckBoxes label="Sugestões de fundamentações pró réu" labelsAndNames={pedidos.pedidos[i].fundamentacoes.map((p, idx) => (p.tipo === 'IMPROCEDENTE' ? { label: p.texto, name: `pedidos.pedidos[${i}].fundamentacoes[${idx}].selecionada` } : null))} onClick={(label, name, checked) => { if (checked) Frm.set(`pedidos.pedidos[${i}].dispositivo`, 'IMPROCEDENTE') }} width={12} />
                        </div>
                    </div>}
                    <div className="row mt-1">
                        <Frm.TextArea label="Fundamentação (opcional)" name={`pedidos.pedidos[${i}].fundamentacao`} width={''} />
                        <Frm.Select label="Dispositivo" name={`pedidos.pedidos[${i}].dispositivo`} options={tiposDeDispositivo} width={2} />
                    </div>
                </div>
            )}
        </div>
        {Frm.get('pedidos')?.pedidos.length > 0 &&
            <div className="row h-print">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', true)} disabled={Frm.get('pedidos')?.pedidos?.some(p => !p.dispositivo)}>
                        Gerar {nextRequest.produto === P.VOTO ? 'Voto' : 'Sentença'}
                    </Button>
                </div>
            </div>
        }
    </>
}