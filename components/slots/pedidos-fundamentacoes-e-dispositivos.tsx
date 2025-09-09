'use client'

import AiContent from "@/components/ai-content"
import { getInternalPrompt } from "@/lib/ai/prompt"
import { GeneratedContent } from "@/lib/ai/prompt-types"
import { FormHelper } from "@/lib/ui/form-support"
import { calcSha256 } from "@/lib/utils/hash"
import { labelToName, maiusculasEMinusculas } from "@/lib/utils/utils"
import { Button } from "react-bootstrap"

export const PedidosFundamentacoesEDispositivos = ({ pedidos, request, Frm, dossierCode }: { pedidos: any[], request: GeneratedContent, Frm: FormHelper, dossierCode: string }) => {
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
        { id: 'PROCEDENTE', name: 'Procedente' },
        { id: 'PARCIALMENTE_PROCEDENTE', name: 'Parcialmente Procedente' },
        { id: 'IMPROCEDENTE', name: 'Improcedente' },
        { id: 'DESCONSIDERAR', name: 'Desconsiderar' },
    ]

    const pedidosAnalisados = Frm.get('pedidosAnalisados')
    if (pedidosAnalisados) {
        // const pedidos = [...Frm.get('pedidos')].filter(p => p.dispositivo).map(p => ({ ...p, fundamentacoes: [...p.fundamentacoes.filter(f => f.selecionada).map(f => f.texto)] }))
        const pedidos = [...Frm.get('pedidos')].filter(p => p.dispositivo && p.dispositivo !== 'DESCONSIDERAR')
        // console.log('pedidosAnalisados', pedidos)
        const data = { ...request.data }
        data.textos = [...request.data.textos, { slug: 'pedidos', descr: 'Pedidos', texto: JSON.stringify(pedidos), sigilo: '0' }]
        const prompt = getInternalPrompt('sentenca')

        return <>
            <h2>{maiusculasEMinusculas(request.title)}</h2>
            <div className="mb-4">
                <div className="alert alert-success pt-4 pb-2">
                    <ol>
                        {pedidos.map((pedido, i) =>
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
            <h2>Sentença</h2>
            <AiContent definition={prompt} data={data} key={`prompt: 'sentenca', data: ${calcSha256(data)}`} dossierCode={dossierCode} />
        </>
    }

    return <>
        <h2>{maiusculasEMinusculas(request.title)}</h2>
        {pedidos.map((pedido, i) =>
            <div className="mb-4" key={i}>
                <div className="alert alert-warning pt-2 pb-3">
                    {false && <div className="row">
                        <Frm.Select label="Liminar" name={`pedidos[${i}].liminar`} options={tiposDeLiminar} width={2} />
                        <Frm.Select label="Tipo de Pedido" name={`pedidos[${i}].tipoDePedido`} options={tiposDePedido} width={2} />
                        <Frm.Select label="Tipo de Verba" name={`pedidos[${i}].verba`} options={tiposDeVerba} width={2} />
                        {Frm.get(`pedidos[${i}].verba`) !== 'NENHUMA' && <Frm.Input label="Valor" name={`pedidos[${i}].valor`} width={2} />}
                    </div>}
                    <div className="row mt-1">
                        <Frm.TextArea label={`Pedido ${i + 1}`} name={`pedidos[${i}].texto`} width={''} />
                    </div>
                    {pedidos[i]?.fundamentacoes?.length > 0 && <div className="row mt-1">
                        <div className="col-6">
                            <Frm.CheckBoxes label="Sugestões de fundamentações pró autor" labelsAndNames={pedidos[i].fundamentacoes.map((p, idx) => (p.tipo === 'PROCEDENTE' ? { label: p.texto, name: `pedidos[${i}].fundamentacoes[${idx}].selecionada` } : null))} onClick={(label, name, checked) => { if (checked) Frm.set(`pedidos[${i}].dispositivo`, 'PROCEDENTE') }} width={12} />
                        </div>
                        <div className="col-6">
                            <Frm.CheckBoxes label="Sugestões de fundamentações pró réu" labelsAndNames={pedidos[i].fundamentacoes.map((p, idx) => (p.tipo === 'IMPROCEDENTE' ? { label: p.texto, name: `pedidos[${i}].fundamentacoes[${idx}].selecionada` } : null))} onClick={(label, name, checked) => { if (checked) Frm.set(`pedidos[${i}].dispositivo`, 'IMPROCEDENTE') }} width={12} />
                        </div>
                    </div>}
                    <div className="row mt-1">
                        <Frm.TextArea label="Fundamentação (opcional)" name={`pedidos[${i}].fundamentacao`} width={''} />
                        <Frm.Select label="Dispositivo" name={`pedidos[${i}].dispositivo`} options={tiposDeDispositivo} width={2} />
                    </div>
                </div>
            </div>
        )}
        {Frm.get('pedidos').length > 0 &&
            <div className="row h-print">
                <div className="col">
                    <Button className="float-end" variant="primary" onClick={() => Frm.set('pedidosAnalisados', true)} disabled={!Frm.get('pedidos').some(p => p.dispositivo)}>
                        Gerar Sentença
                    </Button>
                </div>
            </div>
        }
    </>
}