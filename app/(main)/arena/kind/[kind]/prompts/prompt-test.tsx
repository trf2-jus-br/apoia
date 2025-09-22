'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import AiContent from '@/components/ai-content'
import { InfoDeProduto, P } from '@/lib/proc/combinacoes'
import { Button, Form } from 'react-bootstrap'
import { IATestset } from '@/lib/db/mysql-types'
import { slugify } from '@/lib/utils/utils'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

export default function PromptTest(params: {
    testset: IATestset, overrideSystemPrompt?: string, overridePrompt?: string,
    overrideJsonSchema?: string, overrideFormat?: string
}) {
    const parsedTests = params.testset.content.tests.map((test, idx) => {
        const titulo = test.name
        const infoDeProduto: InfoDeProduto = {
            "produto": P[slugify(params.testset.kind).replace('-', "_").toUpperCase()],
            "dados": [],
            "titulo": titulo,
            "prompt": params.testset.kind,
            "plugins": []
        }
        const textos = test.texts.map(t => ({ numeroDoProcesso: '', descr: t.name, slug: slugify(t.name), texto: t.value, sigilo: '1' }))
        const result = test.expected
        const file = idx.toString()
        return { file, titulo, infoDeProduto, textos, result }
    })

    const [file, setFile] = useState("0")
    const [hidden, setHidden] = useState(true)
    const [refresh, setRefresh] = useState(false)
    // const [definition, setDefinition] = useState<PromptDefinitionType>({ kind: params.testset.kind, prompt: '' })
    // setDefinition()


    useEffect(() => {
        if (!refresh) return
        const id = setInterval(() => {
            setRefresh(false)
        }, 300);
        return () => clearInterval(id);
    }, [refresh])

    const fileChanged = (text) => {
        setHidden(true)
        setFile(text)
    }

    const test = parsedTests.find(e => e.file === file)
    if (!test) return <div className="alert alert-danger">Teste não encontrado {file}</div>

    return (
        <>
            <div className="row d-print-none mt-4">
                <div className="col col-auto">
                    <Form.Select aria-label="Tipo de Visualização" value={file} onChange={e => fileChanged(e.target.value)} className='w-100'>
                        {parsedTests.map(e => (
                            <option key={e.file} value={e.file}>{e.titulo}</option>))}
                    </Form.Select>
                </div>
                <div className="col col-auto">
                    {hidden && <Button className="me-3" onClick={() => setHidden(false)}>Testar</Button>}
                    {!hidden && <Button className="" onClick={() => setRefresh(true)}>Refazer</Button>}
                </div>
            </div>
            {!hidden && !refresh && <>
                <h2 className="mt-3">{test.infoDeProduto.titulo}</h2>
                <AiContent
                    definition={{ kind: params.testset.kind, prompt: '' }}
                    data={{ textos: test.textos }}
                    options={{
                        overrideSystemPrompt: params.overrideSystemPrompt || '',
                        overridePrompt: params.overridePrompt || '',
                        overrideJsonSchema: params.overrideJsonSchema || '',
                        overrideFormat: params.overrideFormat || '',
                        cacheControl: true
                    }} dossierCode={undefined} />
            </>}
        </>
    )
}
