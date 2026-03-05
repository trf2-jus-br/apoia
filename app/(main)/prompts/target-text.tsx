'use client'

import dynamic from 'next/dynamic'
import { Suspense, use, useEffect, useState } from 'react'
import AiContent from '@/components/ai-content'
import { Button, Col, Row, Spinner } from 'react-bootstrap'
import { ContentType, PromptConfigType, PromptDefinitionType } from '@/lib/ai/prompt-types'
import { slugify } from '@/lib/utils/utils'
import { IAPrompt } from '@/lib/db/mysql-types'
import { VisualizationEnum } from '@/lib/ui/preprocess'
import Print from '@/components/slots/print'
import { resolvePromptDefinition, resolvePromptDefinitionByUuid, serverPromptExecuteBuilder } from '@/lib/ai/prompt-actions'
import { sendApproveMessageToParent } from '@/lib/utils/messaging-helper'
import { usePromptContext } from './context/PromptContext'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

/**
 * Get the first non-chat product prompt definition for an internal synthesis type.
 * Uses workflow successors from DB.
 */
const resolveFirstProductDefinition = async (prompt: IAPrompt): Promise<PromptDefinitionType | null> => {
    if (!prompt.origin) return null

    // Use workflow successors from DB (origin-synced aggregator)
    if (prompt.content?.workflow?.successors?.length) {
        for (const step of prompt.content.workflow.successors) {
            const def = await resolvePromptDefinitionByUuid(step.uuid).catch(() => null)
            if (!def) continue
            if (def.kind === 'chat' || def.kind === 'chat-standalone') continue
            return def
        }
    }

    return null
}

const buildStaticDefinition = (prompt: IAPrompt): PromptDefinitionType => {
    return {
        kind: `prompt-${prompt.id}`,
        prompt: prompt.content.prompt,
        systemPrompt: prompt.content.system_prompt,
        jsonSchema: prompt.content.json_schema,
        format: prompt.content.format,
        cacheControl: true,
    }
}

export default function TargetText({ visualization, apiKeyProvided }: { visualization?: VisualizationEnum, apiKeyProvided: boolean }) {
    const { prompt, source, sinkFromURL, sinkButtonText, sourcePayload } = usePromptContext()
    const [markdown, setMarkdown] = useState(source || '')
    const [hidden, setHidden] = useState(!source)
    const [promptConfig, setPromptConfig] = useState({} as PromptConfigType)
    const [content, setContent] = useState<ContentType>()
    const [definition, setDefinition] = useState<PromptDefinitionType | null>(null)

    useEffect(() => {
        if (!prompt) return
        if (prompt.origin) {
            resolveFirstProductDefinition(prompt).then(def => {
                if (def) setDefinition(def)
            })
        } else {
            setDefinition(buildStaticDefinition(prompt))
        }
    }, [prompt])

    if (!prompt) return null
    if (!definition) return <div className="text-center my-3"><Spinner variant="secondary" /></div>

    const textChanged = (text) => {
        setMarkdown(text)
        setHidden(true)
        setContent(undefined)
    }

    useEffect(() => {
        textChanged(source || '')
        if (source)
            setHidden(false)
    }, [source])

    const handleReady = (content: ContentType) => {
        setContent(content)
        if (sinkFromURL === 'to-parent-automatic') {
            sendApproveMessageToParent(content, sourcePayload, prompt?.slug, prompt?.content?.target)
        }
    }

    const textoDescr = prompt.content.editor_label || 'Texto'

    const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
    const handleCopyPrompt = async () => {
        if (!prompt || !markdown || !definition) return
        const exec = await serverPromptExecuteBuilder(definition, { textos: [{ numeroDoProcesso: '', descr: prompt.content?.editor_label || 'Texto', slug: slugify(prompt.content?.editor_label || 'texto'), texto: markdown, sigilo: '0' }] })
        const s: string = exec?.message.map(m => m.role === 'system' ? `# PROMPT DE SISTEMA\n\n${m.content}\n\n# PROMPT` : m.content).join('\n\n')
        if (s) {
            navigator.clipboard.writeText(s)
            setCopiedPrompt(s)
        }
    }

    return (
        <div className="mb-3">
            {/* <h2 className="mt-3">{prompt.content.editor_label}</h2> */}
            {/* <PromptConfig kind="ementa" setPromptConfig={setPromptConfig} /> */}
            {!source && <>
                <div className="form-group"><label>{textoDescr}</label></div>
                <div className="alert alert-secondary mb-1 p-0">
                    <Suspense fallback={null}>
                        <EditorComp markdown={markdown} onChange={textChanged} showPdfUpload={true} />
                    </Suspense>
                </div>
                {hidden && <>
                    <div className="text-body-tertiary">Cole o texto acima e clique em prosseguir.</div>
                </>}
            </>}

            {hidden && <>
                {/* <Button disabled={!markdown || !orgaoJulgador} className="mt-3" onClick={() => setHidden(false)}>Gerar Ementa</Button> */}
                <Button disabled={!markdown} className="mt-3" onClick={() => setHidden(false)}>Prosseguir</Button>
            </>}
            {!hidden && markdown && <div id="printDiv">

                {apiKeyProvided
                    ? <>
                        <h2 className="mt-3">{prompt.name}</h2>
                        <AiContent
                            definition={definition}
                            data={{ textos: [{ numeroDoProcesso: '', descr: textoDescr, slug: slugify(textoDescr), texto: markdown, sigilo: '0' }] }}
                            options={{ cacheControl: true }} config={promptConfig} visualization={visualization} dossierCode={undefined} onReady={(content) => handleReady(content)} />
                        <Row>
                            {content && sinkFromURL === 'to-parent' && <Col><Button variant="success" onClick={() => sendApproveMessageToParent(content, sourcePayload, prompt?.slug, prompt?.content?.target)} className="float-end">{sinkButtonText || 'Aprovar'}</Button></Col>}
                            {/* <Col><Print numeroDoProcesso={slugify(prompt.name)} /></Col> */}
                        </Row>
                    </>
                    : <>
                        <Button className="mt-3" onClick={handleCopyPrompt}>Copiar Prompt</Button>
                        {copiedPrompt && <>
                            <p className="alert alert-warning text-center mt-3">Prompt copiado para a area de transferencia, ja com o conteudo do texto informado acima!</p>
                            <h2>{prompt.name}</h2>
                            <textarea name="prompt" className="form-control" rows={10} defaultValue={copiedPrompt} />
                        </>}
                    </>
                }
            </div>}
        </div>
    )
}



