'use client'

import { Form, Button, Accordion, Nav } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
// import { DeleteForm } from "./record-delete-form"
import dynamic from 'next/dynamic'
import TextareaAutosize from 'react-textarea-autosize'
import { removeOfficial, save, setOfficial } from './prompt-actions'
import { EMPTY_FORM_STATE, FormHelper } from '@/lib/ui/form-support'
import yamlps from 'js-yaml'
import { useState } from 'react'
import _ from 'lodash'
import PromptTest from './prompt-test'
import { IATestset } from '@/lib/db/mysql-types'
import { useEffect, useCallback } from 'react'
import { getTestsetById } from '../testsets/testset-actions'
import { slugify } from '@/lib/utils/utils'

// const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

const Frm = new FormHelper()

export default function PromptTests(props) {
    const router = useRouter()
    const initialState = props.record || { content: {} }
    if (!initialState.model_id || (props.models && props.models[0] && !props.models.map(i => i.id).includes(initialState.model_id))) initialState.model_id = props.models && props.models[0] ? props.models[0].id : null
    if (!initialState.testset_id || (props.testsets && props.testsets[0] && !props.testsets.map(i => i.id).includes(initialState.testset_id))) initialState.testset_id = props.testsets && props.testsets[0] ? props.testsets[0].id : null
    const [data, setData] = useState({ ...initialState })
    const [yaml, setYaml] = useState(yamlps.dump(initialState.content))
    const [formState, setFormState] = useState(EMPTY_FORM_STATE)
    const [tab, setTab] = useState('fields')
    Frm.update(data, (d) => { setData(d); updateYaml(d) }, formState)
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

    return (<>
        <div className="row mb-5">
            <Frm.Select label="Modelo de Linguagem" name="model_id" options={props.models} width={4} />
            <Frm.Select label="Coleção de Testes" name="testset_id" options={[{ id: 0, value: '' }, ...props.testsets]} width={4} />
            <Frm.Button onClick={loadTests} variant="primary">Testar</Frm.Button>
        </div >
        <Button variant="light" className="" onClick={handleBack}>Voltar</Button></>
    )
}