'use client'

import dynamic from 'next/dynamic'
import { Suspense, useMemo, useState } from 'react'
import { Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

type AnonymizeOptions = {
    numeric?: boolean
    cpf?: boolean
    identidade?: boolean
    numeroDeProcesso?: boolean
    numeroDeBeneficio?: boolean
    endereco?: boolean
    telefoneFixo?: boolean
    telefoneMovel?: boolean
    email?: boolean
    oab?: boolean
    url?: boolean
    crm?: boolean
    names?: boolean
}

const defaultOptions: Required<AnonymizeOptions> = {
    numeric: true,
    cpf: true,
    identidade: true,
    numeroDeProcesso: false,
    numeroDeBeneficio: false,
    endereco: true,
    telefoneFixo: true,
    telefoneMovel: true,
    email: true,
    oab: true,
    url: true,
    crm: true,
    names: true,
}

export default function AnonymPage() {
    const [markdown, setMarkdown] = useState('')
    const [options, setOptions] = useState<Required<AnonymizeOptions>>(defaultOptions)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<string>('')
    const [subs, setSubs] = useState<number>(0)

    const canRun = useMemo(() => markdown.trim().length > 0, [markdown])

    const toggle = (key: keyof AnonymizeOptions) => (e: any) => {
        setOptions(prev => ({ ...prev, [key]: e.target.checked }))
    }

    const run = async () => {
        setError(null)
        setLoading(true)
        setResult('')
        setSubs(0)
        try {
            const resp = await fetch('/api/v1/anonym', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: markdown, options }),
            })
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}))
                throw new Error(data?.errormsg || `Erro ${resp.status}`)
            }
            const data = await resp.json()
            setResult(data?.text || '')
            setSubs(data?.substitutions || 0)
        } catch (err: any) {
            setError(err.message || 'Erro desconhecido')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <h2 className="mt-3">Anonimização de Texto</h2>
            <p className="text-body-secondary">Cole o texto abaixo e selecione o que deseja anonimizar.</p>

            <div className="alert alert-secondary mb-1 p-0">
                <Suspense fallback={null}>
                    <EditorComp markdown={markdown} onChange={setMarkdown} />
                </Suspense>
            </div>
            <div className="row">
                <div className="col col-10">
                    <Form>
                        <div className="row">
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Números" checked={options.numeric} onChange={toggle('numeric')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="CPF" checked={options.cpf} onChange={toggle('cpf')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Identidade (RG)" checked={options.identidade} onChange={toggle('identidade')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Número de Processo" checked={options.numeroDeProcesso} onChange={toggle('numeroDeProcesso')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Número de Benefício" checked={options.numeroDeBeneficio} onChange={toggle('numeroDeBeneficio')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Endereços" checked={options.endereco} onChange={toggle('endereco')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Telefone fixo" checked={options.telefoneFixo} onChange={toggle('telefoneFixo')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Telefone móvel" checked={options.telefoneMovel} onChange={toggle('telefoneMovel')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="E-mails" checked={options.email} onChange={toggle('email')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="OAB" checked={options.oab} onChange={toggle('oab')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="URLs" checked={options.url} onChange={toggle('url')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="CRM" checked={options.crm} onChange={toggle('crm')} />
                            </div>
                            <div className="col col-auto">
                                <Form.Check type="checkbox" label="Nomes próprios" checked={options.names} onChange={toggle('names')} />
                            </div>
                        </div>
                    </Form>
                </div>
                <div className="col col-auto ms-auto mt-3">
                    <Button variant="primary" disabled={!canRun || loading} onClick={run}>
                        {loading ? (<><Spinner size="sm" animation="border" className="me-2" />Anonimizando…</>) : 'Anonimizar'}
                    </Button>
                </div>
            </div>

            {error && <Alert className="mt-3" variant="danger">{error}</Alert>}

            {result && (
                <>
                    <div className="d-flex align-items-baseline gap-2 mt-4">
                        <h3 className="m-0">Resultado</h3>
                        <span className="text-body-secondary">{subs} substituições</span>
                    </div>
                    <div className="alert alert-secondary mt-2 p-0">
                        <Suspense fallback={null}>
                            <EditorComp markdown={result} onChange={setResult} />
                        </Suspense>
                    </div>
                </>
            )}
        </>
    )
}
