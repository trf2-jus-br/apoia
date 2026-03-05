'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import AiContent from '@/components/ai-content'
import { Button } from 'react-bootstrap'
import { PromptConfigType, PromptDefinitionType } from '@/lib/ai/prompt-types'
import PromptConfig from '@/components/prompt-config'
import { VisualizationEnum } from '@/lib/ui/preprocess'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

export default function Simplification({ definition }: { definition: PromptDefinitionType }) {
    const [markdown, setMarkdown] = useState('')
    const [hidden, setHidden] = useState(true)
    const [promptConfig, setPromptConfig] = useState({} as PromptConfigType)

    const textChanged = (text) => {
        setMarkdown(text)
        setHidden(true)
    }

    const promptConfigChanged = (config: PromptConfigType) => {
        setPromptConfig(config)
        setHidden(true)
    }

    return (
        <>
            <h2 className="mt-3">Texto</h2>
            <PromptConfig kind="refinamento" setPromptConfig={promptConfigChanged} />
            <div className="alert alert-secondary mb-1 p-0">
                <Suspense fallback={null}>
                    <EditorComp
                        markdown={markdown}
                        onChange={textChanged}
                        showPdfUpload={true}
                    />
                </Suspense>
            </div>
            {hidden && <>
                <div className="text-body-tertiary">
                    Cole o texto, selecione ou arraste um PDF a ser convertido para Linguagem Simples (Gralha).
                    {' '}Clique em &quot;Simplificar&quot; para continuar.
                </div>
                <Button disabled={!markdown} className="mt-3" onClick={() => setHidden(false)}>Simplificar</Button>
            </>}
            {!hidden && markdown && <>
                {/* <h2 className="mt-3">Revisão</h2>
                <AiContent
                    infoDeProduto={{ produto: P.REVISAO, dados: [], titulo: 'Revisão', prompt: 'revisao', plugins: [] }}
                    textos={[{ descr: 'Texto', slug: 'texto', texto: markdown }]} /> */}
                <h2 className="mt-3">Liguagem Simples</h2>
                <AiContent definition={definition} data={{ textos: [{ numeroDoProcesso: '', descr: 'Texto', slug: 'texto', texto: markdown, sigilo: '0' }] }} config={promptConfig} visualization={VisualizationEnum.TEXT_EDITED} dossierCode={undefined} />
            </>}
        </>
    )
}