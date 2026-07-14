'use client'

import { Form, Button, Accordion, Nav, Col, Modal } from 'react-bootstrap'
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
import { enumSorted, ModelProfile } from '@/lib/ai/model-types'
import { Instance, Matter, Scope, Target } from '@/lib/proc/process-types'
import { PieceDescr, PieceStrategy, Plugin, FaseProcessual } from '@/lib/proc/combinacoes'
import { findUnclosedMarking } from '@/lib/ai/template'
import dynamic from 'next/dynamic'
import AiContent from '@/components/ai-content'
import { PromptConfigType, PromptDefinitionType, Mode } from '@/lib/ai/prompt-types'
import { VisualizationEnum } from '@/lib/ui/preprocess'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

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
    const [pending, setPending] = useState(false)
    const [showImportModal, setShowImportModal] = useState(props.importMode || false)
    const [importText, setImportText] = useState('')
    const [showAiContent, setShowAiContent] = useState(false)


    try {
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

        function handleBack() {
            if (data.name && data.id)
                router.push(`/prompts`)
            else
                router.push(`/prompts`)
        }

        const handleImportResult = (content) => {
            if (isTemplate && content.raw) {
                Frm.set('content.template', content.raw)
                // setData({ ...data, content: { ...data.content, template: content.raw } })
                setShowImportModal(false)
                setShowAiContent(false)
                setImportText('')
            }
        }

        const handleExecuteImport = () => {
            setShowAiContent(true)
        }

        async function handleSave() {
            setPending(true)
            // Clean up workflow: remove entries with empty uuid, nullify if both lists are empty
            const saveData = cloneDeep(data)
            if (!saveData.content?.profile) {
                delete saveData.content.profile
            }
            if (saveData.content?.workflow) {
                const preds = (saveData.content.workflow.predecessors || []).filter(p => p.uuid)
                const succs = (saveData.content.workflow.successors || []).filter(s => s.uuid)
                if (preds.length === 0 && succs.length === 0) {
                    delete saveData.content.workflow
                } else {
                    saveData.content.workflow = {
                        ...(preds.length > 0 ? { predecessors: preds } : {}),
                        ...(succs.length > 0 ? { successors: succs } : {}),
                    }
                }
            }
            const result = await save(saveData)
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
        const phaseOptions = enumSorted(FaseProcessual).map(e => ({ id: e.value.name, name: e.value.descr }))
        const modelOptions = [{ id: '', name: 'Padrão' }, ...enumSorted(ModelProfile).map(e => ({ id: e.key, name: e.value.name, disabled: e.key.startsWith('PREMIUM') }))]
        const summaryOptions = [{ id: 'NAO', name: 'Não' }, { id: 'SIM', name: 'Sim' }]
        const shareOptions = [{ id: 'PADRAO', name: 'Padrão', disabled: true }, { id: 'PUBLICO', name: 'Público', disabled: false }, { id: 'BETA_TESTE', name: 'Beta Teste', disabled: true }, { id: 'NAO_LISTADO', name: 'Não Listado' }, { id: 'PRIVADO', name: 'Privado' }, ...(data?.share === 'OCULTO' ? [{ id: 'OCULTO', name: 'Oculto', disabled: true }] : [])]
        // Modo: NULL (ambos) é representado por string vazia na primeira opção.
        const modeOptions = [...enumSorted(Mode).map(e => ({ id: e.value.name, name: e.value.descr })), { id: '', name: 'Ambos' }]
        const pluginOptions = Object.entries(Plugin).map(([key, value]) => ({ id: key, name: value }))

        if (data?.share === 'EM_ANALISE') {
            data.share = 'PUBLICO'
        }

        const unclosedMarking = isTemplate ? findUnclosedMarking(data.content.template || '') : null

        return (
            <>
                <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="xl">
                    <Modal.Header closeButton>
                        <Modal.Title>Importar Modelo</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {!showAiContent && (<>
                            <label>Modelo</label>
                            <div className="alert alert-secondary mb-1 p-0">
                                <EditorComp markdown={importText} onChange={setImportText} />
                            </div>
                            <p className="text-body-secondary">Cole o texto do modelo no campo acima e clique em &quot;Executar&quot; para utilizar a IA para converter o modelo para o formato aceito pela Apoia.</p>
                            <Button disabled={!importText} className="mt-3" onClick={handleExecuteImport}>
                                Executar
                            </Button>
                        </>)}
                        {showAiContent && importText && (<>
                            <label>Convertendo modelo para o padrão da Apoia</label>
                            <AiContent
                                definition={props.templateDefinition}
                                data={{ textos: [{ numeroDoProcesso: '', descr: 'Modelo', slug: 'modelo', texto: importText, sigilo: '0' }] }}
                                config={{} as PromptConfigType}
                                visualization={VisualizationEnum.TEXT_EDITED}
                                dossierCode={undefined}
                                onReady={handleImportResult}
                            />
                            <p className="text-body-secondary mt-0">Aguarde enquanto o modelo é processado. Quando o processamento estiver concluído, ele será automaticamente transferido para a página de criação de prompt baseado em modelo.</p>
                        </>)}
                    </Modal.Body>
                </Modal>
                <div className="row mb-5">
                    <Frm.Input label="Nome" name="name" width={6} explanation="Use maiúsculas e minúsculas." maxLength={64} />
                    <Frm.Input label="Autor" name="content.author" width={6} explanation="Use maiúsculas e minúsculas." maxLength={64} />
                    <Frm.Input label="Descrição (opcional)" name="content.description" explanation="Escreva uma explicação no imperativo, ex.: 'Gere um relatório do processo...' ou 'Analise as peças selecionadas...'." width={12} />
                    <Frm.Select label="Modo" name="mode" options={modeOptions} width={3} />
                    <Frm.MultiSelect label="Segmento" name="content.scope" options={scopeOptions} width={3} />
                    <Frm.MultiSelect label="Instância" name="content.instance" options={instanceOptions} width={3} />
                    <Frm.MultiSelect label="Natureza" name="content.matter" options={matterOptions} width={3} />
                    <Frm.Select label="Fonte dos Dados" name="content.target" options={targetOptions} width={3} />
                    <Frm.Input label="Nome do Campo" name="content.editor_label" width={3} visible={[Target.TEXTO.name, Target.REFINAMENTO.name].includes(data.content.target)} />
                    <Frm.Select label="Seleção de Peças" name="content.piece_strategy" options={pieceStrategyOptions} width={3} visible={Target.PROCESSO.name === data.content.target} />
                    <Frm.MultiSelect label="Tipos de Peças" name="content.piece_descr" options={pieceDescrOptions} width={2} visible={Target.PROCESSO.name === data.content.target && PieceStrategy.TIPOS_ESPECIFICOS.name === data.content.piece_strategy} />
                    <Frm.MultiSelect label="Fases Processuais" name="content.phase" options={phaseOptions} width={3} visible={Target.PROCESSO.name === data.content.target} />
                    <Frm.Select label="Compartilhamento" name="share" options={shareOptions} width={3} />
                    <Frm.Select label="Resumir Selecionadas" name="content.summary" options={summaryOptions} width={3} visible={Target.PROCESSO.name === data.content.target && showAdvancedOptions} />
                    <Frm.Select label="Perfil" name="content.profile" options={modelOptions} width={3} visible={showAdvancedOptions} />
                    <Frm.MultiSelect label="Plugins" name="content.plugins" options={pluginOptions} width={3} visible={showAdvancedOptions && data.content.batch_report} />
                    <Frm.Checkbox label="Lote" name="content.batch_report" width={2} visible={showAdvancedOptions} />
                    <Frm.Input label="Ordem" name="content.sort" width={3} visible={showAdvancedOptions && false} />

                    {/* Workflow: Predecessors and Successors */}
                    {props.allPrompts && props.allPrompts.length > 0 && (
                        <div className={`col col-12 mt-3 mb-3 ${showAdvancedOptions ? '' : 'd-none'}`}>
                            <div className="row">
                                <div className="col col-6">
                                    <label className="form-label fw-bold d-block">Prompts Predecessores</label>
                                    {(data.content?.workflow?.predecessors || []).map((pred, idx) => (
                                        <div key={idx} className="d-flex align-items-center mb-1 gap-2">
                                            <Form.Select size="sm" value={pred.uuid || ''} onChange={(e) => {
                                                const newPreds = [...(data.content.workflow?.predecessors || [])]
                                                const selectedName = props.allPrompts.find(p => p.uuid === e.target.value)?.name || ''
                                                newPreds[idx] = { ...newPreds[idx], uuid: e.target.value, name: selectedName }
                                                setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, predecessors: newPreds } } })
                                            }}>
                                                <option value="">Selecione...</option>
                                                {props.allPrompts.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
                                            </Form.Select>
                                            <Form.Check type="checkbox" label="Opcional" checked={pred.optional || false} onChange={(e) => {
                                                const newPreds = [...(data.content.workflow?.predecessors || [])]
                                                newPreds[idx] = { ...newPreds[idx], optional: e.target.checked }
                                                setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, predecessors: newPreds } } })
                                            }} className="text-nowrap" />
                                            <Button variant="light" size="sm" onClick={() => {
                                                const newPreds = (data.content.workflow?.predecessors || []).filter((_, i) => i !== idx)
                                                setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, predecessors: newPreds.length > 0 ? newPreds : undefined } } })
                                            }}><FontAwesomeIcon icon={faRemove} /></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline-secondary" size="sm" className="mt-1" onClick={() => {
                                        const newPreds = [...(data.content?.workflow?.predecessors || []), { uuid: '', optional: false }]
                                        setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, predecessors: newPreds } } })
                                    }}><FontAwesomeIcon icon={faAdd} /> Predecessor</Button>
                                </div>
                                <div className="col col-6">
                                    <label className="form-label fw-bold d-block">Propts Sucessores</label>
                                    {(data.content?.workflow?.successors || []).map((succ, idx) => (
                                        <div key={idx} className="d-flex align-items-center mb-1 gap-2">
                                            <Form.Select size="sm" value={succ.uuid || ''} onChange={(e) => {
                                                const newSuccs = [...(data.content.workflow?.successors || [])]
                                                const selectedName = props.allPrompts.find(p => p.uuid === e.target.value)?.name || ''
                                                newSuccs[idx] = { ...newSuccs[idx], uuid: e.target.value, name: selectedName }
                                                setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, successors: newSuccs } } })
                                            }}>
                                                <option value="">Selecione...</option>
                                                {props.allPrompts.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
                                            </Form.Select>
                                            <Form.Check type="checkbox" label="Opcional" checked={succ.optional || false} onChange={(e) => {
                                                const newSuccs = [...(data.content.workflow?.successors || [])]
                                                newSuccs[idx] = { ...newSuccs[idx], optional: e.target.checked }
                                                setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, successors: newSuccs } } })
                                            }} className="text-nowrap" />
                                            <Button variant="light" size="sm" onClick={() => {
                                                const newSuccs = (data.content.workflow?.successors || []).filter((_, i) => i !== idx)
                                                setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, successors: newSuccs.length > 0 ? newSuccs : undefined } } })
                                            }}><FontAwesomeIcon icon={faRemove} /></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline-secondary" size="sm" className="mt-1" onClick={() => {
                                        const newSuccs = [...(data.content?.workflow?.successors || []), { uuid: '', optional: false }]
                                        setData({ ...data, content: { ...data.content, workflow: { ...data.content.workflow, successors: newSuccs } } })
                                    }}><FontAwesomeIcon icon={faAdd} /> Sucessor</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className='col col-12'>
                        {showAdvancedOptions && false &&
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
                                                {data.content.system_prompt !== undefined && <Frm.Button variant="outline-secondary" onClick={() => { data.content.system_prompt = undefined; setData({ ...data }) }}><FontAwesomeIcon icon={faRemove} /> Prompt de Sistema</Frm.Button>}
                                            </div>
                                            <div className="row">
                                                <Frm.TextArea label="Prompt (opcional)" name="content.prompt" maxRows={5} width={""} />
                                                {data.content.system_prompt === undefined && <Frm.Button variant="outline-secondary" onClick={() => { data.content.system_prompt = ''; setData({ ...data }) }}><FontAwesomeIcon icon={faAdd} /> Prompt de Sistema</Frm.Button>}
                                            </div>
                                        </>}
                                        <Frm.Markdown key={showImportModal} label="Modelo" name="content.template" maxRows={5} width={""} />
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
                                                {data.content.json_schema !== undefined && <Frm.Button variant="outline-secondary" onClick={() => { data.content.json_schema = undefined; setData({ ...data }) }}><FontAwesomeIcon icon={faRemove} /> Schema</Frm.Button>}
                                            </div>
                                            <div className="row">
                                                {data.content.format !== undefined && <Frm.TextArea label="Format (opcional)" name="content.format" maxRows={5} width={""} />}
                                                {data.content.format !== undefined && <Frm.Button variant="outline-secondary" onClick={() => { data.content.format = undefined; setData({ ...data }) }}><FontAwesomeIcon icon={faRemove} /> Format</Frm.Button>}
                                            </div>
                                            <div className="row">
                                                <Frm.TextArea label="Prompt de Sistema (opcional)" name="content.system_prompt" maxRows={5} width={""} />
                                                {data.content.json_schema === undefined && <Frm.Button variant="outline-secondary" onClick={() => { data.content.json_schema = ''; setData({ ...data }) }}><FontAwesomeIcon icon={faAdd} /> Schema</Frm.Button>}
                                                {data.content.format === undefined && <Frm.Button variant="outline-secondary" onClick={() => { data.content.format = ''; setData({ ...data }) }}><FontAwesomeIcon icon={faAdd} /> Format</Frm.Button>}
                                            </div>
                                        </>}
                                        <Frm.TextArea label="Prompt" name="content.prompt" maxRows={20} explanation={`Utilize {{textos}} onde devem ser incluídos os textos capturados ${Target.PROCESSO.name === data.content.target ? 'das peças do processo' : 'do editor de textos'}, ou serão automaticamente incluídos no início.`} />
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
                        <Button variant="outline-secondary" className="" onClick={handleBack}>Voltar</Button>
                    </div>

                    <div className="col col-auto mt-3 mb-3 ms-auto">
                        {showAdvancedOptions
                            ? <Button variant="outline-secondary" className="me-3" disabled={data.content.system_prompt || data.content.json_schema || data.content.format} onClick={() => { setShowAdvancedOptions(false) }}>Ocultar Opções Avançadas</Button>
                            : <Button variant="outline-secondary" className="me-3" onClick={() => { setShowAdvancedOptions(true) }}>Exibir Opções Avançadas</Button>}
                        <Button variant="primary" disabled={!data?.name || !data?.content?.author || pending || pristine} className="" onClick={handleSave}>Salvar</Button>
                        <FormError formState={formState} />
                    </div>
                </div >
            </>
        )
    } catch (e: any) {
        return (<div className="alert alert-danger">Erro no PromptForm: {e?.message || String(e)}</div>)
    }
}