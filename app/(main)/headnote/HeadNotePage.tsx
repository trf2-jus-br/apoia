'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import AiContent from '@/components/ai-content'
import { Button, Container } from 'react-bootstrap'
import PromptConfig from '@/components/prompt-config'
import { PromptConfigType, PromptDefinitionType } from '@/lib/ai/prompt-types'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })

export default function Revison({ definition }: { definition: PromptDefinitionType }) {
    const [markdown, setMarkdown] = useState('')
    const [orgaoJulgador, setOrgaoJulgador] = useState('')
    const [hidden, setHidden] = useState(true)
    const [promptConfig, setPromptConfig] = useState({} as PromptConfigType)

    const textChanged = (text) => {
        setMarkdown(text)
        setHidden(true)
    }

    const orgaoJulgadorChanged = (text) => {
        setOrgaoJulgador(text)
        setHidden(true)
    }

    return (
        <div className="mb-3">
            <h2 className="mt-3">Geração de Ementa</h2>
            <PromptConfig kind="ementa" setPromptConfig={setPromptConfig} />
            {/* <div className="row mb-3 mt-3">
                <div className="col">
                    <div className="form-group">
                        <label>Órgão Julgador</label>
                        <input type="text" id="key" name="key" placeholder="" autoFocus={true} className="form-control" onChange={(e: React.ChangeEvent<HTMLInputElement>) => orgaoJulgadorChanged(e.target.value)} value={orgaoJulgador} autoComplete='' />
                    </div>
                </div>
            </div> */}
            <div className="form-group"><label>Voto </label></div>
            <div className="alert alert-secondary mb-1 p-0">
                <Suspense fallback={null}>
                    <EditorComp markdown={markdown} onChange={textChanged} showPdfUpload={true} />
                </Suspense>
            </div>
            {hidden && <>
                <div className="text-body-tertiary">Cole o texto do voto na caixa acima e clique em &quot;Gerar Ementa&quot;.</div>
            </>}
            {hidden && <>
                {/* <Button disabled={!markdown || !orgaoJulgador} className="mt-3" onClick={() => setHidden(false)}>Gerar Ementa</Button> */}
                <Button disabled={!markdown} className="mt-3" onClick={() => setHidden(false)}>Gerar Ementa</Button>
            </>}
            {!hidden && markdown && <>
                <h2 className="mt-3">Ementa</h2>
                <AiContent
                    definition={definition}
                    // data={{ textos: [{ descr: 'EXTRATO DE ATA', slug: 'extrato-de-ata', texto: `ÓRGÃO JULGADOR: ${orgaoJulgador}\nTIPO DE DECISÁO: UNÂMINE` }, { descr: 'Voto', slug: 'voto', texto: markdown }] }}
                    data={{ textos: [{ numeroDoProcesso: '', descr: 'Voto', slug: 'voto', texto: markdown, sigilo: '0' }] }}
                    options={{ cacheControl: true }} config={promptConfig} dossierCode={undefined} />
            </>}
        </div>
    )
}