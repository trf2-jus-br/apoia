'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import AiContent from '@/components/ai-content'
import { Button } from 'react-bootstrap'
import { getInternalPrompt } from '@/lib/ai/prompt'
import PromptConfig from '@/components/prompt-config'
import { PromptConfigType } from '@/lib/ai/prompt-types'
import { VisualizationEnum } from '@/lib/ui/preprocess'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

export default function Revison() {
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
                    <EditorComp markdown={markdown} onChange={textChanged} />
                </Suspense>
            </div>
            {hidden && <>
                <div className="text-body-tertiary">Cole o texto a ser revisado na caixa acima e clique em &quot;Revisar&quot;.</div>
                <Button disabled={!markdown} className="mt-3" onClick={() => setHidden(false)}>Revisar</Button>
            </>}
            {!hidden && markdown && <>
                {/* <h2 className="mt-3">Revisão</h2>
                <AiContent
                    infoDeProduto={{ produto: P.REVISAO, dados: [], titulo: 'Revisão', prompt: 'revisao', plugins: [] }}
                    textos={[{ descr: 'Texto', slug: 'texto', texto: markdown }]} /> */}
                <h2 className="mt-3">Refinamento</h2>
                <AiContent definition={getInternalPrompt('refinamento')} data={{ textos: [{ descr: 'Texto', slug: 'texto', texto: markdown }] }} config={promptConfig} visualization={VisualizationEnum.DIFF} dossierCode={undefined} />
            </>}
        </>
    )
}