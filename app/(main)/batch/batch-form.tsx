'use client'

import React, { useState, FormEvent, useEffect } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { useRouter } from 'next/navigation'
import Fetcher from '@/lib/utils/fetcher'
import { TipoDeSinteseEnum } from '@/lib/proc/combinacoes'
import { StatusDeLancamento } from '@/lib/proc/process-types'
import { TiposDeSinteseValido } from '@/lib/proc/info-de-produto'

export default function ProcessNumberForm(params) {
    const router = useRouter()
    noStore()

    const [batchName, setBatchName] = useState('')
    const [complete, setComplete] = useState(false)
    const [tipoDeSintese, setTipoDeSintese] = useState<TipoDeSinteseEnum>('RESUMOS_TRIAGEM')
    const [input, setInput] = useState('')
    const [processing, setProcessing] = useState('')
    const [ready, setReady] = useState('')
    const [error, setError] = useState('')
    const [running, setRunning] = useState(false)

    let inputItems: string[] = []
    let processingItems: string[] = []
    let readyItems: string[] = []
    let errorItems: string[] = []

    // Obter lista de tipos de síntese válidos para usuários públicos
    const tiposDeSinteseOptions = TiposDeSinteseValido
        .filter(t => t.status <= StatusDeLancamento.PUBLICO)
        .map(tipo => ({ value: tipo.id, label: tipo.nome }))

    const updateItems = () => {
        inputItems = input.split('\n').filter((n) => n.length > 0)
        processingItems = processing.split('\n').filter((n) => n.length > 0)
        readyItems = ready.split('\n').filter((n) => n.length > 0)
        errorItems = error.split('\n').filter((n) => n.length > 0)
    }

    const updateStates = () => {
        setInput(inputItems.join('\n'))
        setProcessing(processingItems.join('\n'))
        setReady(readyItems.join('\n'))
        setError(errorItems.join('\n'))
    }

    const execute = async (batchName: string, number: string) => {
        // do the job
        try {

            const result = await Fetcher.post(`/api/v1/batch/${encodeURIComponent(batchName)}/${encodeURIComponent(number)}?complete=${complete ? 'true' : 'false'}&tipoDeSintese=${encodeURIComponent(tipoDeSintese)}`)
            // if (result?.status === 'OK')
            readyItems.unshift(number)
        } catch (e) {
            errorItems.unshift(`${number}: ${e.message}`)
        } finally {
            // remove from processing
            processingItems = processingItems.filter((item) => item !== number);
        }
    }

    const executeNext = async () => {
        if (!running) return
        if (inputItems.length === 0) {
            setRunning(false)
            return
        }
        // remove from input and add to processing
        const number = inputItems.shift()?.replaceAll(/[^\d]/g, '') as string
        // throw an error if the number is invalid
        if (!number.match(/^\d{20}$/))
            throw new Error('Número de processo inválido')

        processingItems.unshift(number)
        await execute(batchName, number as string)
        updateStates()
    }

    useEffect(() => {
        updateItems()
        if (running) {
            setTimeout(executeNext) //, 30000)
        }
        // executeNext depends on current mutable arrays; acceptable to ignore exhaustive-deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running, ready, error])

    const handleClick = (e: FormEvent) => {
        e.preventDefault()
        if (running) {
            setRunning(false)
            return
        }
        setRunning(true)
        setTimeout(executeNext)
    }

    const handleShowResultsClick = (e: FormEvent) => {
        e.preventDefault()
        window.open(`/api/v1/batch/${encodeURIComponent(batchName)}/html`, '_blank')
    }

    const preprocessInput = (value: string) => {
        value = value.replaceAll(/(:.*?)$/gm, '')
        value = value.replaceAll('\n', ',').replaceAll(/[^\d,]/g, '').replaceAll(',', '\n').replaceAll('\n\n', '\n').trim()
        return value
    }

    return (
        <>
            <div className="row">
                <div className="col col-6">
                    <div className="form-group mb-3">
                        <label className="form-label">Nome do Lote</label>
                        <input id="batchName" name="batchName" placeholder="" className="form-control" onChange={(e) => setBatchName(e.target.value)} value={batchName} disabled={running} />
                    </div>
                </div>
                <div className="col col-3">
                    <div className="form-group mb-3">
                        <label className="form-label">Tipo de Síntese</label>
                        <select
                            id="tipoDeSintese"
                            name="tipoDeSintese"
                            className="form-control"
                            onChange={(e) => setTipoDeSintese(e.target.value as TipoDeSinteseEnum)}
                            value={tipoDeSintese}
                            disabled={running}
                        >
                            {tiposDeSinteseOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="col col-3">
                    <div className="form-group mb-3">
                        <input
                            type="checkbox"
                            id="complete"
                            name="complete"
                            className="form-check-input"
                            onChange={(e) => setComplete(e.target.checked)}
                            checked={complete}
                            disabled={running}
                        />
                        <label className="form-check-label ms-2">Completo</label>
                        <p className="text-body-tertiary">O custo é bem superior quando é realizada a análise completa.</p>
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col col-3">
                    <div className="form-group">
                        <label className="form-label">Entrada</label>
                        <textarea id="input" name="input" placeholder="" className="form-control" onChange={(e) => setInput(preprocessInput(e.target.value))} value={input} rows={10} disabled={running} />
                    </div>
                </div>
                <div className="col col-3">
                    <div className="form-group">
                        <label className="form-label">Processando</label>
                        <textarea id="input" name="input" placeholder="" className="form-control" onChange={(e) => setProcessing(e.target.value)} value={processing} rows={10} disabled={true} />
                    </div>
                </div>
                <div className="col col-3">
                    <div className="form-group">
                        <label className="form-label">Saída</label>
                        <textarea id="input" name="input" placeholder="" className="form-control" onChange={(e) => setReady(e.target.value)} value={ready} rows={10} disabled={true} />
                    </div>
                </div>
                <div className="col col-3">
                    <div className="form-group">
                        <label className="form-label">Com Erro</label>
                        <textarea id="input" name="input" placeholder="" className="form-control" onChange={(e) => setError(e.target.value)} value={error}
                            rows={10} disabled={true}
                            style={{ whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'scroll' }} />
                    </div>
                </div>
            </div>
            <div className="row pt-3">
                <div className="col">
                    <button onClick={handleClick} className="btn btn-primary">
                        {running ? <span>&#x23F8;</span> : <span>&#x23F5;</span>}
                    </button>
                    <button onClick={handleShowResultsClick} className="btn btn-success float-end">
                        <span>Ver Resultado</span>
                    </button>
                </div>
            </div>
        </>
    )
}