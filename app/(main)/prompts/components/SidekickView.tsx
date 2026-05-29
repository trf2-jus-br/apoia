import { Container, Button } from "react-bootstrap"
import { IAPromptList } from "@/lib/db/mysql-types"
import ProcessNumberForm from "../process-number-form"
import ProcessContents from "../process-contents"
import ProcessTitle from "@/components/slots/process-title"
import { SubtituloLoading } from "@/components/slots/subtitulo"
import TargetText from "../target-text"
import { VisualizationEnum } from "@/lib/ui/preprocess"
import ErrorMessage from "@/components/error-message"
import Chat from "@/components/slots/chat"
import { slugify } from "@/lib/utils/utils"
import BreadCrumbs from "../breadcrumbs"
import { useMemo, useState, useEffect } from "react"
import { usePromptContext } from "../context/PromptContext"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faExternalLink } from "@fortawesome/free-solid-svg-icons"
import { SuggestionCards } from "./SuggestionCards"

interface SidekickViewProps {
    apiKeyProvided: boolean
    model?: string
    promptsSidekick: IAPromptList[]
    resetToHome: () => void
    resetProcess: () => void
    resetPrompt: () => void
}

export function SidekickView({
    apiKeyProvided,
    model,
    promptsSidekick,
    resetToHome,
    resetProcess,
    resetPrompt
}: SidekickViewProps) {
    const {
        prompt,
        numeroDoProcesso,
        dadosDoProcesso,
        setPrompt,
        setNumber,
        promptInitialized,
        faseAtual,
    } = usePromptContext()
    const [urlNovaAba, setUrlNovaAba] = useState('')

    useEffect(() => {
        const url = numeroDoProcesso
            ? `${window.location.origin}/prompts?process=${numeroDoProcesso}`
            : `${window.location.origin}/`
        setUrlNovaAba(url)
    }, [numeroDoProcesso])

    const promptButtons = useMemo(() => {
        return (
            <div className="d-flex flex-wrap gap-2 justify-content-center">
                {promptsSidekick && promptsSidekick.length > 0 ? (
                    promptsSidekick.filter(p => p.is_hidden !== undefined ? !p.is_hidden : p.is_auto_hidden === false).filter(p => p?.slug !== prompt?.slug || p?.origin !== prompt?.origin).map((p, i) => (
                        <Button
                            key={p.base_id ?? `${p.slug}-${i}`}
                            onClick={() => setPrompt(p)}
                            variant="light"
                            style={{
                                borderColor: `hsl(${30 + ((i % 14) / 13) * (330 - 30)}, 85%, 40%)`,
                                color: `hsl(${30 + ((i % 14) / 13) * (330 - 30)}, 85%, 30%)`,
                            }}
                        >
                            {p.name}
                        </Button>
                    ))
                ) : (
                    <div className="text-muted">Nenhum prompt favorito disponível.</div>
                )}
            </div>
        )
    }, [promptsSidekick, prompt, setPrompt])

    const handleSuggestionClick = (selectedPrompt: IAPromptList) => {
        setPrompt(selectedPrompt)
    }

    if (!promptInitialized) {
        return null
    }

    return (
        <Container className="mt-0 mb-3" fluid={true}>
            <div className="float-end"><a href={urlNovaAba} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba"><FontAwesomeIcon icon={faExternalLink} /></a></div>
            <BreadCrumbs
                resetToHome={resetToHome}
                resetProcess={resetProcess}
                resetPrompt={resetPrompt}
            />
            {prompt ? (
                <>
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
                                            sidekick={true}
                                            promptButtons={
                                                prompt?.slug === 'chat' && !!prompt?.origin ? (
                                                    <>
                                                        {/* <p className="text-center mt-1x ms-3 me-3">
                                                            Converse sobre o processo, selecione um dos seus prompts favoritos, ou lance a Apoia em uma{' '}
                                                            <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>.
                                                        </p> */}
                                                        {promptButtons}
                                                    </>
                                                ) : undefined
                                            }
                                        />
                                    </>
                                ) : (
                                    <>
                                        <ProcessTitle id={numeroDoProcesso} />
                                        <SubtituloLoading />
                                    </>
                                )}
                            </div>
                        )
                    ) : prompt.content.target === 'TEXTO' ? (
                        <TargetText key={`${prompt}`} apiKeyProvided={apiKeyProvided} />
                    ) : prompt.content.target === 'REFINAMENTO' ? (
                        <TargetText key={`${prompt}`} apiKeyProvided={apiKeyProvided} visualization={VisualizationEnum.DIFF} />
                    ) : prompt.content.target === 'CHAT' ? (
                        <Chat
                            definition={{ ...prompt, kind: prompt.slug }}
                            data={{ textos: [] }}
                            model={model}
                            withTools={true}
                            key={1}
                            footer={
                                <div className="text-body-tertiary h-print">
                                    O Agente de IA busca informações e peças de qualquer processo. Para contextualizar, inclua o número do processo na sua primeira pergunta.
                                </div>
                            }
                            sidekick
                            promptButtons={
                                <>
                                    <p className="text-center mt-3 ms-3 me-3">
                                        <img src="/apoia-logo-horiz-cor-fundo-claro.png" className="mb-3" style={{ height: "3em" }} />
                                        <br />
                                        {/* Converse comigo, selecione um dos seus prompts favoritos, ou lance a Apoia em uma{' '}
                                        <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>. */}
                                    </p>
                                    {promptButtons}
                                </>
                            }
                        />
                    ) : (
                        <ErrorMessage message={`Tipo de alvo do prompt desconhecido: ${prompt.content.target}`} />
                    )}
                </>
            ) : numeroDoProcesso ? (
                <>
                    <ProcessTitle
                        id={dadosDoProcesso?.numeroDoProcesso}
                        onRemove={() => {
                            resetProcess()
                        }}
                    />
                    {faseAtual && (
                        <div className="ps-3 pe-3 pb-3">
                            <SuggestionCards
                                faseAtual={faseAtual}
                                prompts={promptsSidekick}
                                onPromptClick={handleSuggestionClick}
                            />
                        </div>
                    )}
                    {/* <p className="text-center mt-3 ms-3 me-3">
                        Selecione um dos seus prompts favoritos ou lance a Apoia em uma{' '}
                        <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>.
                    </p> */}
                    <div className="ps-3 pe-3 pb-3">{promptButtons}</div>
                </>
            ) : (
                <>
                    <h1 className="text-center mt-5">Bem vindo à Apoia</h1>
                    {/* <p className="text-center mt-3 ms-3 me-3">
                        Selecione um dos seus prompts favoritos ou lance a Apoia em uma{' '}
                        <a href={urlNovaAba} target="_blank" rel="noopener noreferrer">nova aba</a>.
                    </p> */}
                    <div className="ps-3 pe-3 pb-3">{promptButtons}</div>
                </>
            )}
        </Container>
    )
}
