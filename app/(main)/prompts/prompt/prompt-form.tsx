'use client'

import { Form, Button, Accordion, Nav, Col } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
// import { DeleteForm } from "./record-delete-form"
import TextareaAutosize from 'react-textarea-autosize'
import { removeOfficial, save, setOfficial } from './prompt-actions'
import { EMPTY_FORM_STATE, FormHelper, FormError } from '@/lib/ui/form-support'
import yamlps from 'js-yaml'
import { useState } from 'react'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAdd, faRemove } from '@fortawesome/free-solid-svg-icons'
import { enumSorted } from '@/lib/ai/model-types'
import { Instance, Matter, Scope, Target } from '@/lib/proc/process-types'
import { PieceDescr, PieceStrategy } from '@/lib/proc/combinacoes'
import { findUnclosedMarking } from '@/lib/ai/template'

// const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

const Frm = new FormHelper()

export default function PromptForm(props) {
    const router = useRouter()
    const initialState = props.record || { content: {} }
    // if (!initialState.model_id || (props.models && props.models[0] && !props.models.map(i => i.id).includes(initialState.model_id))) initialState.model_id = props.models && props.models[0] ? props.models[0].id : null
    // if (!initialState.testset_id || (props.testsets && props.testsets[0] && !props.testsets.map(i => i.id).includes(initialState.testset_id))) initialState.testset_id = props.testsets && props.testsets[0] ? props.testsets[0].id : null
    const [data, setData] = useState(cloneDeep(initialState))
    const [yaml, setYaml] = useState(yamlps.dump(initialState.content))
    const [formState, setFormState] = useState(EMPTY_FORM_STATE)
    const [tab, setTab] = useState('fields')
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(initialState?.content?.system_prompt || initialState?.content?.json_schema || initialState?.content?.format ? true : false)
    const [isTemplate, setIsTemplate] = useState(initialState?.content?.template || props.template ? true : false)
    Frm.update(data, (d) => { setData(d); updateYaml(d) }, formState)
    const pristine = isEqual(data, { ...initialState })

    const updateYaml = (newData) => {
        setYaml(yamlps.dump(newData.content))
    }

    const handleYamlChanged = (value: string) => {
        setYaml(value)
        setData({ ...data, content: yamlps.load(value) })
    }


    if (formState?.message === 'success') {
        handleBack()
    }

    const [pending, setPending] = useState(false)

    function handleBack() {
        if (data.name && data.id)
            router.push(`/prompts`)
        else
            router.push(`/prompts`)
    }

    async function handleSave() {
        setPending(true)
        const result = await save(data)
        setFormState(result as any)
        setPending(false)
    }

    async function handleSetOfficial() {
        setPending(true)
        const result = await setOfficial(data.id)
        setFormState(result as any)
        setPending(false)
    }

    async function handleRemoveOfficial() {
        setPending(true)
        const result = await removeOfficial(data.id)
        setFormState(result as any)
        setPending(false)
    }

    const scopeOptions = enumSorted(Scope).map(e => ({ id: e.value.name, name: e.value.descr }))
    const instanceOptions = enumSorted(Instance).map(e => ({ id: e.value.name, name: e.value.descr }))
    const matterOptions = enumSorted(Matter).map(e => ({ id: e.value.name, name: e.value.descr }))
    const targetOptions = enumSorted(Target).map(e => ({ id: e.value.name, name: e.value.descr }))
    const pieceStrategyOptions = enumSorted(PieceStrategy).map(e => ({ id: e.value.name, name: e.value.descr }))
    const pieceDescrOptions = enumSorted(PieceDescr).map(e => ({ id: e.value.name, name: e.value.descr }))
    const summaryOptions = [{ id: 'NAO', name: 'Não' }, { id: 'SIM', name: 'Sim' }]
    const shareOptions = [{ id: 'PADRAO', name: 'Padrão', disabled: true }, { id: 'PUBLICO', name: 'Público', disabled: false }, { id: 'NAO_LISTADO', name: 'Não Listado' }, { id: 'PRIVADO', name: 'Privado' }]
    const [field, setField] = useState([]);

    if (data?.share === 'EM_ANALISE') {
        data.share = 'PUBLICO'
    }

    const unclosedMarking = isTemplate ? findUnclosedMarking(data.content.template || '') : null

    return (
        <div className="row mb-5">
            <Frm.Input label="Nome" name="name" width={3} explanation="Use maiúsculas e minúsculas." />
            <Frm.Input label="Autor" name="content.author" width={3} explanation="Use maiúsculas e minúsculas." />
            <Frm.MultiSelect label="Segmento" name="content.scope" options={scopeOptions} width={2} />
            <Frm.MultiSelect label="Instância" name="content.instance" options={instanceOptions} width={2} />
            <Frm.MultiSelect label="Natureza" name="content.matter" options={matterOptions} width={2} />
            {/* <Frm.Input label="Descrição" name="content.descr" width={12} /> */}
            <Frm.Select label="Fonte dos Dados" name="content.target" options={targetOptions} width={3} />
            <Frm.Input label="Nome do Campo" name="content.editor_label" width={3} visible={[Target.TEXTO.name, Target.REFINAMENTO.name].includes(data.content.target)} />
            <Frm.Select label="Seleção de Peças" name="content.piece_strategy" options={pieceStrategyOptions} width={3} visible={Target.PROCESSO.name === data.content.target} />
            <Frm.MultiSelect label="Tipos de Peças" name="content.piece_descr" options={pieceDescrOptions} width={2} visible={Target.PROCESSO.name === data.content.target && PieceStrategy.TIPOS_ESPECIFICOS.name === data.content.piece_strategy} />
            <Frm.Select label="Resumir Selecionadas" name="content.summary" options={summaryOptions} width={2} visible={Target.PROCESSO.name === data.content.target} />
            <Frm.Select label="Compartilhamento" name="share" options={shareOptions} width={2} />

            <div className='col col-12'>
                {showAdvancedOptions &&
                    <Nav variant="underline" defaultActiveKey="fields" onSelect={(eventKey) => { setTab(eventKey || 'fields') }} className="mb-2">
                        <Nav.Item>
                            <Nav.Link eventKey="fields">Campos</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="yaml">YAML</Nav.Link>
                        </Nav.Item>
                    </Nav>
                }
                {tab === 'fields'
                    ? (<>
                        {isTemplate
                            ? (<>
                                {showAdvancedOptions && <>
                                    <div className="row">
                                        {data.content.system_prompt !== undefined && <Frm.TextArea label="Prompt de Sistema (opcional)" name="content.system_prompt" maxRows={5} width={""} />}
                                        {data.content.system_prompt !== undefined && <Frm.Button variant="light" onClick={() => { data.content.system_prompt = undefined; setData({ ...data }) }}><FontAwesomeIcon icon={faRemove} /> Prompt de Sistema</Frm.Button>}
                                    </div>
                                    <div className="row">
                                        <Frm.TextArea label="Prompt (opcional)" name="content.prompt" maxRows={5} width={""} />
                                        {data.content.system_prompt === undefined && <Frm.Button variant="light" onClick={() => { data.content.system_prompt = ''; setData({ ...data }) }}><FontAwesomeIcon icon={faAdd} /> Prompt de Sistema</Frm.Button>}
                                    </div>
                                </>}
                                <Frm.Markdown label="Modelo" name="content.template" maxRows={5} width={""} />
                                {unclosedMarking
                                    ? <div className="alert alert-danger mt-3">
                                        Marcação não fechada: <strong>{unclosedMarking.kind}</strong> na linha <strong>{unclosedMarking.lineNumber}</strong> - <span className="template-error" dangerouslySetInnerHTML={{ __html: unclosedMarking.lineContent }} />
                                    </div>

                                    : <div className="text-body-tertiary">Utilize &#39;&#123;&#39; para inclusões e &#39;&#123;&#123;&#39; para condicionais. Mais detalhes no <a href="https://trf2.gitbook.io/apoia/criar-prompt-a-partir-de-um-modelo" target="_blank">manual</a>.</div>
                                }
                            </>)
                            : (<>
                                {showAdvancedOptions && <>
                                    <div className="row">
                                        {data.content.json_schema !== undefined && <Frm.TextArea label="JSON Schema (opcional)" name="content.json_schema" maxRows={5} width={""} />}
                                        {data.content.json_schema !== undefined && <Frm.Button variant="light" onClick={() => { data.content.json_schema = undefined; setData({ ...data }) }}><FontAwesomeIcon icon={faRemove} /> Schema</Frm.Button>}
                                    </div>
                                    <div className="row">
                                        {data.content.format !== undefined && <Frm.TextArea label="Format (opcional)" name="content.format" maxRows={5} width={""} />}
                                        {data.content.format !== undefined && <Frm.Button variant="light" onClick={() => { data.content.format = undefined; setData({ ...data }) }}><FontAwesomeIcon icon={faRemove} /> Format</Frm.Button>}
                                    </div>
                                    <div className="row">
                                        <Frm.TextArea label="Prompt de Sistema (opcional)" name="content.system_prompt" maxRows={5} width={""} />
                                        {data.content.json_schema === undefined && <Frm.Button variant="light" onClick={() => { data.content.json_schema = ''; setData({ ...data }) }}><FontAwesomeIcon icon={faAdd} /> Schema</Frm.Button>}
                                        {data.content.format === undefined && <Frm.Button variant="light" onClick={() => { data.content.format = ''; setData({ ...data }) }}><FontAwesomeIcon icon={faAdd} /> Format</Frm.Button>}
                                    </div>
                                </>}
                                <Frm.TextArea label="Prompt" name="content.prompt" maxRows={20} explanation={`Utilize {{textos}} onde devem ser incluídos os textos capturados ${Target.PROCESSO.name === data.content.target ? 'das peças do processo' : 'do editor de textos'}, ou serão automaticamente incluídos no final.`} />
                            </>)}
                    </>)
                    : (<TextareaAutosize className="form-control" value={yaml} onChange={(e) => handleYamlChanged(e.target.value)} />)}
            </div>
            {data?.share === 'PUBLICO' &&
                <div className="col col-12"><div className="alert alert-danger mb-0 mt-3"><p><strong>Atenção:</strong> Um prompt público fica visível para todos os usuários.</p>
                    <p>Para que seu prompt permaneça público, certifique-se de:</p>
                    <ol className="mb-0">
                        <li><strong>Descrever a função do seu prompt ao nomeá-lo</strong>, para facilitar a utilização pelos demais.</li>
                        <li>Escrever o nome do prompt e o nome do autor com letras minúsculas e maiúsculas, <strong>não usar apenas maiúsculas</strong>;</li>
                        <li><strong>Testar</strong> exaustivamente o prompt antes de disponibilizá-lo, a fim de verificar que apresenta os resultados esperados.</li>
                    </ol>
                </div>
                </div>}
            <div className="col col-auto mt-3 mb-3">
                <Button variant="light" className="" onClick={handleBack}>Voltar</Button>
            </div>

            <div className="col col-auto mt-3 mb-3 ms-auto">
                {showAdvancedOptions
                    ? <Button variant="light" className="me-3" disabled={data.content.system_prompt || data.content.json_schema || data.content.format} onClick={() => { setShowAdvancedOptions(false) }}>Ocultar Opções Avançadas</Button>
                    : <Button variant="light" className="me-3" onClick={() => { setShowAdvancedOptions(true) }}>Exibir Opções Avançadas</Button>}
                <Button variant="primary" disabled={pending || pristine} className="" onClick={handleSave}>Salvar</Button>
                <FormError formState={formState} />
            </div>
        </div >
    )
}