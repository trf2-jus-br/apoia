'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useEffect } from 'react'
import AiContent from '../../components/ai-content'
import { P } from '@/lib/proc/combinacoes'
import { Button, Container, Form } from 'react-bootstrap'
import { TestFileType } from './testfiletype'
import { get } from 'http'
import { TextoType } from '@/lib/ai/prompt-types'

const EditorComp = dynamic(() => import('../../components/EditorComponent'), { ssr: false })

export default function Test(params: { tests: TestFileType[] }) {
    const parsedTests = params.tests.map(f => {
        const data = JSON.parse(getSubstring(f.contents, 'data'))
        const titulo = data.titulo
        const infoDeProduto = data.infoDeProduto
        const unparsedTextos = getSubstring(f.contents, 'texts')
        const textos = parseTextos(unparsedTextos)
        const result = getSubstring(f.contents, 'result')
        const file = f.file
        return { file, titulo, infoDeProduto, textos, result }
    })

    const [file, setFile] = useState(params.tests[0].file)
    const [hidden, setHidden] = useState(true)
    const [refresh, setRefresh] = useState(false)

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
                    <Button className="me-3" onClick={() => setHidden(false)}>Testar</Button>
                    <Button className="" onClick={() => setRefresh(true)}>Refazer</Button>
                </div>
            </div>
            {!hidden && !refresh && <>
                <h2 className="mt-3">{test.infoDeProduto.titulo}</h2>
                <AiContent definition={test.infoDeProduto} data={{ textos: test.textos }} dossierCode={undefined} />
            </>}
        </>
    )
}

const getSubstring = (text: string, delimiter: string) => {
    const startTag = `<${delimiter}>`
    const endTag = `</${delimiter}>`
    const startIndex = text.indexOf(startTag) + startTag.length
    const endIndex = text.indexOf(endTag)
    return text.substring(startIndex, endIndex)
}

const parseTextos = (unparsedTextos: string): TextoType[] => {
    const textos: TextoType[] = []
    const regex = /<text title="(?<title>[^"]+)" slug="(?<slug>[^"]+)">\s*(?<contents>.+?)\s*<\/text>/gs
    let m
    while ((m = regex.exec(unparsedTextos)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        textos.push({ descr: m.groups.title, slug: m.groups.slug, texto: m.groups.contents })
    }
    return textos
}