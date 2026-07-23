'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import AiContent from '@/components/ai-content'
import { Button } from 'react-bootstrap'
import { PromptConfigType, PromptDefinitionType } from '@/lib/ai/prompt-types'
import PromptConfig from '@/components/prompt-config'
import { VisualizationEnum } from '@/lib/ui/preprocess'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

export default function Revison({ definition }: { definition: PromptDefinitionType }) {
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
            <h1 className="visually-hidden">Revisão de Texto</h1>
            <h2 className="mt-3">Texto</h2>
            <PromptConfig kind="revisao-de-texto" setPromptConfig={promptConfigChanged} />
            <div className="alert alert-secondary mb-1 p-0">
                <Suspense fallback={null}>
                    <EditorComp markdown={markdown} onChange={textChanged} showPdfUpload={true} />
                </Suspense>
            </div>
            {hidden && <>
                <div className="text-body-tertiary" id="revisar-help">Cole o texto a ser revisado na caixa acima e clique em &quot;Revisar&quot;.</div>
                <Button disabled={!markdown} className="mt-3" onClick={() => setHidden(false)} accessKey="r" aria-describedby="revisar-help"><u>R</u>evisar</Button>
            </>}
            {!hidden && markdown && <>
                <h2 className="mt-3">Revisão de Texto</h2>
                <AiContent definition={definition} data={{ textos: [{ numeroDoProcesso: '', descr: 'Texto', slug: 'texto', texto: markdown, sigilo: '0' }] }} config={promptConfig} visualization={VisualizationEnum.DIFF} dossierCode={undefined} />
            </>}
        </>
    )
}