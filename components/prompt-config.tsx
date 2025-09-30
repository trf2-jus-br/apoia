'use client'

import { EMPTY_FORM_STATE, FormHelper } from '@/lib/ui/form-support'
import { useEffect, useState } from 'react'
import _ from 'lodash'
import { SelectableItem } from '@/lib/db/mysql-types'
import { loadModels, loadPrompts } from '@/lib/ai/prompt-config'
import { PromptConfigType } from '@/lib/ai/prompt-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit } from '@fortawesome/free-solid-svg-icons'
import { faSave } from '@fortawesome/free-regular-svg-icons'

const Frm = new FormHelper()

function PromptConfigForm({ kind, config, onSave }: { kind: string, config: PromptConfigType, onSave: (config: PromptConfigType) => void }) {
    const [prompts, setPrompts] = useState([] as SelectableItem[])
    const [models, setModels] = useState([] as SelectableItem[])
    const [prompt_slug, setPromptSlug] = useState(config.prompt_slug ? config.prompt_slug.toString() : undefined)
    const [model_slug, setModelSlug] = useState(config.model_slug ? config.model_slug.toString() : undefined)
    const [extra, setExtra] = useState(config.extra)

    useEffect(() => {
        const asyncSetData = async () => {
            const promptRecords = await loadPrompts(kind)
            if (promptRecords?.length)
                setPrompts(promptRecords.filter(i => i.is_official).map(i => ({ id: i.slug, name: i.name })))
            const modelRecords = (await loadModels(kind))
            if (modelRecords?.length)
                setModels(modelRecords.map(i => ({ id: i.name, name: i.name })))
        }
        asyncSetData()
    }, [kind])

    const returnConfig = () => {
        const prompt_name = prompts.find(p => p.id == prompt_slug)?.name
        const model_name = models.find(m => m.id == model_slug)?.name
        onSave({
            prompt_slug: prompt_slug ? prompt_slug : undefined, prompt_name,
            model_slug: model_slug ? model_slug : undefined, model_name,
            extra: extra ? extra : undefined
        })
    }

    Frm.update({ prompt_slug: prompt_slug, model_slug: model_slug, extra }, (d) => { setPromptSlug(d.prompt_slug); setModelSlug(d.model_slug); setExtra(d.extra) }, EMPTY_FORM_STATE)

    return <div className="mb-5">
        <div className="alert alert-warning pt-0">
            <div className="row">
                {prompts?.length
                    ? <Frm.Select label="Prompt" name="prompt_slug" options={[{ id: '', name: 'Padrão' }, ...prompts]} width={6} />
                    : null}
                {/* {models?.length
                    ? <Frm.Select label="Modelo de Linguagem" name="model_slug" options={[{ id: '', name: 'Padrão' }, ...models]} width={6} />
                    : null} */}
                <Frm.TextArea label="Personalização do Prompt" name="extra" width={''} />
                <Frm.Button onClick={returnConfig} variant="primary"><FontAwesomeIcon icon={faSave} /></Frm.Button>
            </div>
        </div>
    </div >
}

export default function PromptConfig({ kind, setPromptConfig }: { kind: string, setPromptConfig: (config: PromptConfigType) => void }) {
    const [editing, setEditing] = useState(false)
    const [current, setCurrent] = useState({} as PromptConfigType)

    useEffect(() => {
        const stored = localStorage.getItem(`prompt-config-${kind}`)
        if (stored) {
            const storedConfig = JSON.parse(stored)
            setCurrent(storedConfig)
            setPromptConfig(storedConfig)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onSave = (newConfig: PromptConfigType) => {
        setCurrent(newConfig)
        localStorage.setItem(`prompt-config-${kind}`, JSON.stringify(newConfig))
        setPromptConfig(newConfig)
        setEditing(false)
    }

    if (!editing) {
        const a: string[] = []
        if (current.prompt_name)
            a.push(`Prompt: ${current.prompt_name}`)
        if (current.model_name)
            a.push(`Modelo de linguagem: ${current.model_name}`)
        if (current.extra)
            a.push(`Personalização do Prompt: ${current.extra}`)
        const s = a.join(', ') || 'Prompt'
        return <p className="text-body-tertiary">{s} - <FontAwesomeIcon onClick={() => { setEditing(true) }} icon={faEdit} /></p>
    }
    return <PromptConfigForm kind={kind} config={current} onSave={onSave} />
}