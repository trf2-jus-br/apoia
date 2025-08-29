'use client'

import { Form, Button, Accordion, Nav, Container } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
// import { DeleteForm } from "./record-delete-form"
import dynamic from 'next/dynamic'
import TextareaAutosize from 'react-textarea-autosize'
import { removeOfficial, save, setOfficial } from './testset-actions'
import { EMPTY_FORM_STATE, FormHelper, FormError } from '@/lib/ui/form-support'
import yamlps from 'js-yaml'
import { useState } from 'react'
import _ from 'lodash'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAdd, faRemove } from '@fortawesome/free-solid-svg-icons'
import { T } from '@/lib/proc/combinacoes'
import { slugify } from '@/lib/utils/utils'

// const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

const Frm = new FormHelper()
const tiposDePecas = Object.entries(T).map(t => ({ id: t[0], name: t[1] }))

export default function TestsetForm(props) {
    const router = useRouter()
    const initialState = props.record
    if (!initialState.model_id) initialState.model_id = props.models && props.models[0] ? props.models[0].id : null
    const [data, setData] = useState(_.cloneDeep(initialState))
    const [yaml, setYaml] = useState(yamlps.dump(initialState.content))
    const [formState, setFormState] = useState(EMPTY_FORM_STATE)
    const [tab, setTab] = useState('fields')
    Frm.update(data, (d) => { setData(d); updateYaml(d) }, formState)

    const pristine = _.isEqual(data, { ...initialState })

    const updateYaml = (newData) => {
        setYaml(yamlps.dump(newData.content))
    }

    const handleYamlChanged = (value: string) => {
        setYaml(value)
        setData({ ...data, content: yamlps.load(value) })
    }

    const addTest = () => {
        const newData = { ...data }
        newData.content.tests ||= []
        newData.content.tests.push({ name: "", texts: [], variables: [], questions: [] })
        setData(newData);
        updateYaml(newData)
    };

    const removeTest = (index: number) => {
        const newData = { ...data };
        newData.content.tests = newData.content.tests.filter((_, i) => i !== index);
        setData(newData);
        updateYaml(newData)
    };

    const addText = (index: number) => {
        const newData = { ...data };
        newData.content.tests[index].texts ||= []
        newData.content.tests[index].texts.push({ name: tiposDePecas[0].id, value: "" });
        setData(newData);
        updateYaml(newData)
    };

    const removeText = (index: number, txtIndex: number) => {
        const newData = { ...data };
        newData.content.tests[index].texts = newData.content.tests[index].texts.filter((_, i) => i !== txtIndex);
        setData(newData);
        updateYaml(newData)
    };

    const addVariable = (index: number) => {
        const newData = { ...data };
        newData.content.tests[index].variables ||= []
        newData.content.tests[index].variables.push({ name: "", value: "" });
        setData(newData);
        updateYaml(newData)
    };

    const removeVariable = (index: number, varIndex: number) => {
        const newData = { ...data };
        newData.content.tests[index].variables = newData.content.tests[index].variables.filter((_, i) => i !== varIndex);
        setData(newData);
        updateYaml(newData)
    };

    const addQuestion = (index: number) => {
        const newData = { ...data };
        newData.content.tests[index].questions ||= []
        newData.content.tests[index].questions.push({ question: "" });
        setData(newData);
        updateYaml(newData)
    };

    const removeQuestion = (index: number, qIndex: number) => {
        const newData = { ...data };
        newData.content.tests[index].questions = newData.content.tests[index].questions.filter((_, i) => i !== qIndex);
        setData(newData);
        updateYaml(newData)
    };


    if (formState?.message === 'success') {
        router.push(`/arena/kind/${data.kind}/testsets/${slugify(data.name)}`)
    }

    const [pending, setPending] = useState(false)

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

    return (
        <div className="row">
            <Frm.Input label="Nome" name="name" width={6} />
            <Frm.Select label="Modelo de Linguagem" name="model_id" options={props.models} width={""} />
            <Frm.Button onClick={addTest}><FontAwesomeIcon icon={faAdd} /> Teste</Frm.Button>

            <div className='col col-12'>
                <Nav variant="underline" defaultActiveKey="fields" onSelect={(eventKey) => { setTab(eventKey || 'fields') }} className="mt-2">
                    <Nav.Item>
                        <Nav.Link eventKey="fields">Campos</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="yaml">YAML</Nav.Link>
                    </Nav.Item>
                </Nav>
                {tab === 'fields'
                    ? data.content.tests.map((item, index) => (<>
                        <div key={index} className="alert alert-secondary mt-3">
                            <h3 className="mb-0">Teste {index + 1} <Button variant="light" onClick={() => removeTest(index)}><FontAwesomeIcon icon={faRemove} /></Button></h3>
                            <div className="row">
                                <Frm.Input label="Nome" name={`content.tests[${index}].name`} width={""} />
                                {(data.content.tests[index].texts?.length || 0) === 0 && <Frm.Button onClick={() => addText(index)}><FontAwesomeIcon icon={faAdd} /> Texto</Frm.Button>}
                                {(data.content.tests[index].variables?.length || 0) === 0 && <Frm.Button onClick={() => addVariable(index)}><FontAwesomeIcon icon={faAdd} /> Variável</Frm.Button>}
                            </div>
                            {data.content.tests[index].texts?.length ? <>
                                <h5 className="mt-4 mb-0">Textos <Button variant="light" onClick={() => addText(index)}><FontAwesomeIcon icon={faAdd} /></Button></h5>
                                {item.texts.map((text, txtIndex) => (<>
                                    <div className="row" key={txtIndex}>
                                        <Frm.Select label="Tipo" name={`content.tests[${index}].texts[${txtIndex}].name`} options={tiposDePecas} width={3} />
                                        <Frm.TextArea label="Conteúdo" name={`content.tests[${index}].texts[${txtIndex}].value`} width={""} maxRows={5} />
                                        <Frm.Button variant="light" onClick={() => removeText(index, txtIndex)}><FontAwesomeIcon icon={faRemove} /></Frm.Button>
                                    </div>
                                </>))}
                            </> : null}
                            {data.content.tests[index].variables?.length ? <>
                                <h5 className="mt-4 mb-0">Variáveis <Button variant="light" onClick={() => addVariable(index)}><FontAwesomeIcon icon={faAdd} /></Button></h5>
                                {item.variables.map((variable, varIndex) => (<>
                                    <div className="row" key={varIndex}>
                                        <Frm.Input label="Nome" name={`content.tests[${index}].variables[${varIndex}].name`} width={3} />
                                        <Frm.TextArea label="Valor" name={`content.tests[${index}].variables[${varIndex}].value`} width={""} maxRows={5} />
                                        <Frm.Button variant="light" onClick={() => removeVariable(index, varIndex)}><FontAwesomeIcon icon={faRemove} /></Frm.Button>
                                    </div>
                                </>))}
                            </> : null}
                            <div className="row">
                                <Frm.TextArea label="Resultado Esperado" name={`content.tests[${index}].expected`} width={""} maxRows={5} />
                                {(data.content.tests[index].questions?.length || 0) === 0 && <Frm.Button onClick={() => addQuestion(index)}><FontAwesomeIcon icon={faAdd} /> Questão</Frm.Button>}
                            </div>
                            {data.content.tests[index].questions?.length ? <>
                                <h5 className="mt-4 mb-0">Questões <Button variant="light" onClick={() => addQuestion(index)}><FontAwesomeIcon icon={faAdd} /></Button></h5>
                                {item.questions.map((question, qIndex) => (<>
                                    <div className="row" key={qIndex}>
                                        <Frm.TextArea label="Questão" name={`content.tests[${index}].questions[${qIndex}].question`} width={""} maxRows={5} />
                                        <Frm.Button variant="light" onClick={() => removeQuestion(index, qIndex)}><FontAwesomeIcon icon={faRemove} /></Frm.Button>
                                    </div>
                                </>))}
                            </> : null}
                        </div>
                    </>))
                    : (<TextareaAutosize className="form-control" value={yaml} onChange={(e) => handleYamlChanged(e.target.value)} />)}
            </div>

            <div className="col col-auto mt-3 mb-3">
                {pristine && data.id && (data.is_official
                    ? <Button variant="secondary" disabled={pending} className="me-3" onClick={handleRemoveOfficial}>Desmarcar como Oficial</Button>
                    : <Button variant="secondary" disabled={pending} className="me-3" onClick={handleSetOfficial}>Marcar como Oficial</Button>
                )}
                <Button variant="primary" disabled={pending || pristine} className="me-3" onClick={handleSave}>Salvar</Button>
                <FormError formState={formState} />

                {/* <Suspense>
                    <DeleteForm id={state.id} />
                </Suspense> */}
            </div>

        </div >
    )
}