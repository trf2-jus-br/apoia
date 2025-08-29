'use client'

import React, { useState, FormEvent, useEffect } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { Button, Form } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
// import { produceContent } from './produce-content'
import Fetcher from '@/lib/utils/fetcher'

export default function ProcessNumberForm(params) {
    const router = useRouter()
    noStore()

    const [input, setInput] = useState('')
    const [processing, setProcessing] = useState('')
    const [ready, setReady] = useState('')
    const [error, setError] = useState('')
    const [running, setRunning] = useState(false)

    let inputItems: string[] = []
    let processingItems: string[] = []
    let readyItems: string[] = []
    let errorItems: string[] = []

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

    const execute = async (number: string) => {
        // do the job
        try {

            const result = await Fetcher.post(`/api/v1/identify-pieces/${encodeURIComponent(number)}`)
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
        await execute(number as string)
        updateStates()
    }

    useEffect(() => {
        updateItems()
        if (running) {
            setTimeout(executeNext)
        }
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

    const preprocessInput = (value: string) => {
        value = value.replaceAll(/(:.*?)$/gm, '')
        value = value.replaceAll('\n', ',').replaceAll(/[^\d,]/g, '').replaceAll(',', '\n').replaceAll('\n\n', '\n').trim()
        return value
    }

    return (
        <>
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
                    <button onClick={handleClick} className="btn btn-primary float-end">
                        {running ? <span>&#x23F8;</span> : <span>&#x23F5;</span>}
                    </button>
                </div>
            </div>
        </>
    )
}