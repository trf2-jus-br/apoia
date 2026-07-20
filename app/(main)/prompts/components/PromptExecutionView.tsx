import { Container } from "react-bootstrap"
import ProcessNumberForm from "../process-number-form"
import ProcessContents from "../process-contents"
import ProcessTitle from "@/components/slots/process-title"
import { SubtituloLoading } from "@/components/slots/subtitulo"
import TargetText from "../target-text"
import { VisualizationEnum } from "@/lib/ui/preprocess"
import { PromptHeader } from "./PromptHeader"
import { usePromptContext } from "../context/PromptContext"
import { useAppContext } from "@/app/context/appContext"

interface PromptExecutionViewProps {
    apiKeyProvided: boolean
    model?: string
}

export function PromptExecutionView({
    apiKeyProvided,
    model
}: PromptExecutionViewProps) {
    const {
        prompt,
        numeroDoProcesso,
        dadosDoProcesso,
        setPrompt,
        setNumber,
    } = usePromptContext()
    const { isBetaTester } = useAppContext()
    
    if (!prompt) return null
    return (
        <Container className="mt-4" fluid={false}>
            {(prompt.content.target !== 'PROCESSO' || !numeroDoProcesso) && (
                <PromptHeader prompt={prompt} onPromptChange={() => setPrompt(null)} variant="header" />
            )}
            {prompt.content.target === 'PROCESSO' ? (
                !numeroDoProcesso ? (
                    <ProcessNumberForm id={`${prompt.base_id}`} onChange={setNumber} />
                ) : (
                    <div id="printDiv">
                        {dadosDoProcesso ? (
                            <>
                                <ProcessTitle id={dadosDoProcesso?.numeroDoProcesso} />
                                <ProcessContents
                                    apiKeyProvided={apiKeyProvided}
                                    model={model}
                                >
                                    <PromptHeader prompt={prompt} onPromptChange={() => setPrompt(null)} />
                                </ProcessContents>
                            </>
                        ) : (
                            <>
                                <ProcessTitle id={numeroDoProcesso} />
                                <SubtituloLoading />
                                <PromptHeader prompt={prompt} onPromptChange={() => setPrompt(null)} />
                            </>
                        )}
                    </div>
                )
            ) : prompt.content.target === 'TEXTO' ? (
                <TargetText key={`${prompt}`} apiKeyProvided={apiKeyProvided} />
            ) : prompt.content.target === 'REFINAMENTO' ? (
                <TargetText key={`${prompt}`} apiKeyProvided={apiKeyProvided} visualization={VisualizationEnum.DIFF} />
            ) : null}
        </Container>
    )
}
