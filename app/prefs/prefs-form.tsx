'use client';

import React, { useState, FormEvent, useEffect } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { useRouter } from 'next/navigation';
import { enumSorted, Model, ModelProvider } from '@/lib/ai/model-types';
import { EMPTY_FORM_STATE, FormHelper } from '@/lib/ui/form-support';
import { StatusDeLancamento } from '@/lib/proc/process-types';

const Frm = new FormHelper()

export default function PrefsForm(params) {
    noStore()
    const initialState = JSON.parse(JSON.stringify(params.initialState))
    const initialFormState = JSON.parse(JSON.stringify(EMPTY_FORM_STATE))
    const [processing, setProcessing] = useState(false)
    const [data, setData] = useState(initialState)
    const [formState, setFormState] = useState(initialFormState)
    const [refreshCount, setRefreshCount] = useState(0)
    const router = useRouter();

    Frm.update(data, setData, formState)

    const handleClick = (e) => {
        setProcessing(true);
        e.preventDefault();
        const cookie = btoa(JSON.stringify(data))
        document.cookie = `prefs=${cookie}; path=/;`
        // document.cookie = `model=${cookie}; path=/; Secure; SameSite=Strict; HttpOnly;`
        router.replace(`/`)
        router.refresh()
        // setProcessing(false);
    }

    const handleClear = (e) => {
        e.preventDefault();
        document.cookie = `prefs=; path=/;`
        setData(JSON.parse(JSON.stringify(params.initialState)))
        setFormState(JSON.parse(JSON.stringify(EMPTY_FORM_STATE)))
        setRefreshCount(refreshCount + 1)
        router.push(`/`)
        router.refresh()
    }

    const getAvailableModel = () => {
        for (const m of enumSorted(Model)) {
            if (data.env && !!data.env[m.value.provider.apiKey])
                return m.value.name
        }
        // if (params.defaultModel) return params.defaultModel
        // for (const m of enumSorted(Model)) {
        //     if (params.availableApiKeys.includes(m.value.provider.apiKey))
        //         return m.value.name
        // }
        return ''
    }

    const isDisabled = (model): boolean => {
        const providerApiKey = model.value.provider.apiKey
        const enabled = data.env && !!data.env[providerApiKey]
            || ((params.userMayChangeModel || !params.defaultModel) && params.availableApiKeys.includes(providerApiKey))
            || (!params.userMayChangeModel && (model.value.name === params.defaultModel || params.selectableModels?.includes(model.value.name)))
        return !enabled
    }

    const validator = (value: string, name: string, regex: RegExp): string | undefined => {
        let error: string | undefined = undefined
        if (value && !regex.test(value)) error = 'Confirme se a Chave da API é válida'
        const newFormState = { ...formState }
        if (error) {
            newFormState.fieldErrors[name] = [error]
        } else {
            delete newFormState.fieldErrors[name]
        }
        setFormState(newFormState)
        return error
    }

    const modelOptions = enumSorted(Model)
        // .sort((a, b) => a.value.provider.id - b.value.provider.id)
        .map(e => ({ id: e.value.name, name: e.value.name, disabled: isDisabled(e), hidden: isDisabled(e), visible: params.statusDeLancamento >= e.value.provider.status }))
        .sort((a, b) => a.disabled ? 1 : b.disabled ? -1 : 0)
    // .filter(e => e.visible)

    useEffect(() => {
        const oldData = data
        const newData = { ...data, model: getAvailableModel() }
        for (const model of enumSorted(Model)) {
            if (oldData.model === model.value.name && isDisabled(model)) {
                setData(newData)
                return
            }
        }
        if (!oldData.model && newData.model) {
            setData(newData)
            return
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    return (
        <>
            <div className="row justify-content-center">
                <div className="col col-12 col-md-8 col-xxl-6">
                    <h4 className="text-center mt-3 mb-2">Modelo de Inteligência Artificial</h4>
                    <p className="text-center">Antes de usar a Apoia é necessário fornecer uma chave de API e selecionar o modelo de IA desejado no formulário abaixo. Leia atentamente a <a href="https://github.com/trf2-jus-br/apoia/wiki/Modelos-de-IA-e-Chaves-de-APIs">documentação</a>, principalmente no que se refere aos limites de uso e a LGPD.</p>
                </div>
            </div>
            <div >
                <form className="row justify-content-center" autoComplete='off'>
                    <div className="col col-12 col-md-8 col-xxl-6">
                        <div className=" d-block mx-auto mb-3 alert-secondary alert">
                            <div key={refreshCount}>
                                {enumSorted(ModelProvider).map((provider) => (
                                    <div className="row mb-2" key={provider.value.name} hidden={params.statusDeLancamento < provider.value.status}>
                                        <Frm.Input label={`${provider.value.name}: Chave da API`} name={`env['${provider.value.apiKey}']`} validator={(value: string, name: string) => validator(value, name, provider.value.apiKeyRegex)} width={provider.value.resourceName ? 8 : provider.value.accessKeyId ? 4 : 12} />
                                        {provider.value.resourceName &&
                                            <Frm.Input label={`Nome do Recurso/URL`} name={`env['${provider.value.resourceName}']`} width="4" />
                                        }
                                        {provider.value.accessKeyId && <>
                                            <Frm.Input label={`Id Chave`} name={`env['${provider.value.accessKeyId}']`} width="4" />
                                            <Frm.Input label={`Região`} name={`env['${provider.value.region}']`} width="4" />
                                        </>}
                                    </div>
                                ))}
                                {/* <div className="row mb-3">
                                    <div className="col">
                                    <div className="form-group">
                                    <label>Chave da API</label>
                                    <input type="text" id="key" name="key" placeholder="" autoFocus={true} className="form-control" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)} value={apiKey} autoComplete='off' />
                                    </div>
                                    </div>
                                    </div> */}
                                <div className="row mb-2">
                                    <Frm.Select label="Modelo Padrão" name="model" options={[{ id: '', name: '[Selecionar]' }, ...modelOptions]} />
                                </div>
                                <div className="row pt-3">
                                    <div className="col">
                                        <button onClick={handleClear} className="btn btn-warning" style={{ width: '10em' }}>Limpar</button>
                                    </div>
                                    <div className="col">
                                        <button onClick={handleClick} disabled={processing || !data.model} className="btn btn-primary float-end" style={{ width: '10em' }}>{processing
                                            ? (<span className="spinner-border text-white opacity-50" style={{ width: '1em', height: '1em' }} role="status"><span className="visually-hidden">Loading...</span></span>)
                                            : 'Salvar'}</button>

                                    </div>
                                    {/* {JSON.stringify(data)} */}
                                </div>
                            </div>
                        </div>
                    </div>
                </form >
                <div className="row justify-content-center">
                    <div className="col col-12 col-md-8 col-xxl-6">
                        <p>As chaves ficarão armazenadas no seu próprio navegador e só serão transferidas para a Apoia no momento do uso.</p>
                    </div>
                </div>
            </div >
        </>
    )
}