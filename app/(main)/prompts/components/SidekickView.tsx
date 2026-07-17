import { Container } from "react-bootstrap"
import { IAPromptList } from "@/lib/db/mysql-types"
import ProcessNumberForm from "../process-number-form"
import ProcessContents from "../process-contents"
import ProcessTitle from "@/components/slots/process-title"
import { SubtituloLoading } from "@/components/slots/subtitulo"
import TargetText from "../target-text"
import { VisualizationEnum } from "@/lib/ui/preprocess"
import ErrorMessage from "@/components/error-message"
import Chat from "@/components/slots/chat"
import BreadCrumbs from "../breadcrumbs"
import { useMemo, useState, useEffect } from "react"
import { usePromptContext } from "../context/PromptContext"
import { useModeUrl } from "@/lib/utils/use-mode-url"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faExternalLink } from "@fortawesome/free-solid-svg-icons"
import { PromptButton } from "./PromptButton"
import { PromptDivider } from "./PromptDivider"

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
        suggestedPrompts,
        isBetaTester,
    } = usePromptContext()
    const [urlNovaAba, setUrlNovaAba] = useState('')
    const modeUrl = useModeUrl()

    useEffect(() => {
        const url = numeroDoProcesso
            ? modeUrl(`${window.location.origin}/prompts?process=${numeroDoProcesso}`)
            : modeUrl(`${window.location.origin}/`)
        setUrlNovaAba(url)
    }, [numeroDoProcesso, modeUrl])

    // Lista de prompts "demais" (favoritos) com os sugeridos já filtrados
    const demaisPrompts = useMemo(() => {
        if (!promptsSidekick || promptsSidekick.length === 0) return []
        return promptsSidekick
            .filter(p => p.is_hidden !== undefined ? !p.is_hidden : p.is_auto_hidden === false)
            .filter(p => p?.slug !== prompt?.slug || p?.origin !== prompt?.origin)
            .filter(p => !suggestedPrompts.some(sp => sp?.slug === p?.slug && sp?.origin === p?.origin))
    }, [promptsSidekick, prompt, suggestedPrompts])

    // Bloco renderizado: mostra sugeridos com divisor (se houver) e,
    // em seguida, demais prompts também com divisor (se houver).
    const promptButtons = useMemo(() => {
        const hasSugeridos = !!faseAtual && suggestedPrompts.length > 0
        const hasDemais = demaisPrompts.length > 0

        if (!hasSugeridos && !hasDemais) {
            return <div className="text-muted text-center">Nenhum prompt disponível.</div>
        }

        return (
            <div className="d-flex flex-column align-items-center w-100 gap-0">
                {hasSugeridos && (
                    <>
                        <PromptDivider label="Prompts Sugeridos" />
                        <div className="d-flex flex-wrap gap-2 justify-content-center w-100">
                            {suggestedPrompts.map((p, i) => (
                                <PromptButton
                                    key={p.base_id ?? `${p.slug}-${i}`}
                                    prompt={p}
                                    index={i}
                                    onClick={setPrompt}
                                    variant="suggested"
                                />
                            ))}
                        </div>
                    </>
                )}
                {hasDemais && (
                    <>
                        {hasSugeridos ? <PromptDivider label="Demais Prompts" /> : <div className="mb-3" />}
                        <div className="d-flex flex-wrap gap-2 justify-content-center w-100">
                            {demaisPrompts.map((p, i) => (
                                <PromptButton
                                    key={p.base_id ?? `${p.slug}-${i}`}
                                    prompt={p}
                                    index={i}
                                    onClick={setPrompt}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        )
    }, [faseAtual, suggestedPrompts, demaisPrompts, setPrompt])

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
                                            isBetaTester={isBetaTester}
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
