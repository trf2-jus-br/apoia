'use client'

import { Form, Button, Accordion, Nav } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
// import { DeleteForm } from "./record-delete-form"
// import dynamic from 'next/dynamic'
import TextareaAutosize from 'react-textarea-autosize'
import { removeOfficial, save, setOfficial } from './prompt-actions'
import { EMPTY_FORM_STATE, FormHelper, FormError } from '@/lib/ui/form-support'
import yamlps from 'js-yaml'
import { useState } from 'react'
import _ from 'lodash'
import PromptTest from './prompt-test'
import { IATestset } from '@/lib/db/mysql-types'
import { useEffect, useCallback } from 'react'
import { getTestsetById } from '../testsets/testset-actions'
import { slugify } from '@/lib/utils/utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAdd, faRemove } from '@fortawesome/free-solid-svg-icons'

// const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

const Frm = new FormHelper()

export default function PromptForm(props) {
    const router = useRouter()
    const initialState = props.record || { content: {} }
    if (!initialState.model_id || (props.models && props.models[0] && !props.models.map(i => i.id).includes(initialState.model_id))) initialState.model_id = props.models && props.models[0] ? props.models[0].id : null
    if (!initialState.testset_id || (props.testsets && props.testsets[0] && !props.testsets.map(i => i.id).includes(initialState.testset_id))) initialState.testset_id = props.testsets && props.testsets[0] ? props.testsets[0].id : null
    const [data, setData] = useState(_.cloneDeep(initialState))
    const [yaml, setYaml] = useState(yamlps.dump(initialState.content))
    const [formState, setFormState] = useState(EMPTY_FORM_STATE)
    const [tab, setTab] = useState('fields')
    Frm.update(data, (d) => { setData(d); updateYaml(d) }, formState)
    const pristine = _.isEqual(data, { ...initialState })
    const [testset, setTestset] = useState(undefined as IATestset | undefined)

    const loadTests = useCallback(async () => {
        if (!data.testset_id) {
            setTestset(undefined)
            return
        }
        if (data.testset_id === testset?.id) return
        setTestset(await getTestsetById(data.testset_id))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.testset_id, testset?.id])

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
            router.push(`/arena/kind/${data.kind}/prompts/${slugify(data.name)}`)
        else
            router.push(`/arena/kind/${data.kind}`)
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

    useEffect(() => {
        loadTests()
    }, [data.testset_id, loadTests])

    return (
        <div className="row mb-5">
            <Frm.Input label="Nome" name="name" width={4} />
            <Frm.Select label="Modelo de Linguagem Padrão" name="model_id" options={props.models} width={4} />
            <Frm.Select label="Coleção de Testes Padrão" name="testset_id" options={[{ id: 0, value: '' }, ...props.testsets]} width={4} />

            <div className='col col-12'>
                <Nav variant="underline" defaultActiveKey="fields" onSelect={(eventKey) => { setTab(eventKey || 'fields') }} className="mb-2">
                    <Nav.Item>
                        <Nav.Link eventKey="fields">Campos</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="yaml">YAML</Nav.Link>
                    </Nav.Item>
                </Nav>
                {tab === 'fields'
                    ? (<>
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
                        <Frm.TextArea label="Prompt" name="content.prompt" maxRows={20} />
                    </>)
                    : (<TextareaAutosize className="form-control" value={yaml} onChange={(e) => handleYamlChanged(e.target.value)} />)}
            </div>
            <div className="col col-auto mt-3 mb-3">
                <Button variant="light" className="" onClick={handleBack}>Voltar</Button>
            </div>

            <div className="col col-auto mt-3 mb-3 ms-auto">
                {pristine && data.id && data.id && (data.is_official
                    ? <Button variant="secondary" disabled={pending} className="me-3" onClick={handleRemoveOfficial}>Desmarcar como Oficial</Button>
                    : <Button variant="secondary" disabled={pending} className="me-3" onClick={handleSetOfficial}>Marcar como Oficial</Button>
                )}
                <Button variant="primary" disabled={pending || pristine} className="" onClick={handleSave}>Salvar</Button>
                <FormError formState={formState} />

                {/* <Suspense>
                    <DeleteForm id={state.id} />
                </Suspense> */}
            </div>

            {testset && <><hr className="mt-3" /><h2>Testes</h2>
                <PromptTest testset={testset} overrideSystemPrompt={data.content.system_prompt} overridePrompt={data.content.prompt} overrideJsonSchema={data.content.json_schema} overrideFormat={data.content.format} />
            </>}

        </div >
    )
}