import { Container, Tabs, Tab, Dropdown, DropdownButton } from "react-bootstrap"
import { IAPromptList } from "@/lib/db/mysql-types"
import PromptsTable from "../prompts-table"
import Link from "next/link"
import { ProcessFilters } from "./ProcessFilters"
import { usePromptContext } from "../context/PromptContext"
import { SuggestionCards } from "./SuggestionCards"
import { useModeUrl } from "@/lib/utils/use-mode-url"
import ModeLink from "@/components/mode-link"
import { useCallback, useEffect, useRef, useState } from "react"
import { playConvergeSound, playErrorSound } from "@/lib/sound"

interface MainViewProps {
    promptsPrincipais: IAPromptList[]
    promptsComunidade: IAPromptList[]
    promptOnClick: (kind: string, row: any) => void
    isModerator: boolean
    apiKeyProvided: boolean
}

export function MainView({
    promptsPrincipais,
    promptsComunidade,
    promptOnClick,
    isModerator,
    apiKeyProvided
}: MainViewProps) {
    const { activeTab, setActiveTab, setNumeroDoProcesso, faseAtual, suggestedPrompts, filtro } = usePromptContext()

    // Contagem pós-filtro (texto) reportada por cada PromptsTable.
    const [counts, setCounts] = useState<{ principal: number; comunidade: number }>({ principal: 0, comunidade: 0 })
    const [singleRows, setSingleRows] = useState<{ principal: IAPromptList | null; comunidade: IAPromptList | null }>({ principal: null, comunidade: null })

    // Factory estável: cada callback é memoizado com deps vazias, usando updates funcionais.
    // Sem isso, cada render cria uma nova referência de função que dispara o effect na Table,
    // provocando loop infinito (Maximum update depth exceeded).
    const handleFiltered = useCallback((tab: 'principal' | 'comunidade') => (info: { count: number; rows: any[] }) => {
        setCounts(prev => prev[tab] === info.count ? prev : { ...prev, [tab]: info.count })
        setSingleRows(prev => {
            const newSingle = info.count === 1 ? info.rows[0] as IAPromptList : null
            return prev[tab]?.id === newSingle?.id ? prev : { ...prev, [tab]: newSingle }
        })
    }, [])

    // Auto-troca: se a tab ativa ficar vazia e a outra tiver itens, troca automaticamente.
    useEffect(() => {
        if (activeTab === 'principal' && counts.principal === 0 && counts.comunidade > 0) {
            setActiveTab('comunidade')
        } else if (activeTab === 'comunidade' && counts.comunidade === 0 && counts.principal > 0) {
            setActiveTab('principal')
        }
    }, [activeTab, counts, setActiveTab])

    // Convergência: exatamente uma única tab com itens e essa tab com exatamente 1 item.
    const principalVisible = counts.principal > 0
    const comunidadeVisible = counts.comunidade > 0
    const visibleTabs = [
        ...(principalVisible ? [['principal', counts.principal, singleRows.principal] as const] : []),
        ...(comunidadeVisible ? [['comunidade', counts.comunidade, singleRows.comunidade] as const] : []),
    ]
    const converged = visibleTabs.length === 1 && visibleTabs[0][1] === 1
    const singleExecutablePrompt: IAPromptList | null = converged ? visibleTabs[0][2] : null

    // Toca o som apenas na transição para o estado de convergência (não repete).
    const prevConverged = useRef(false)
    useEffect(() => {
        if (converged && !prevConverged.current) {
            playConvergeSound()
        }
        prevConverged.current = converged
    }, [converged])

    // Toca o som apenas na transição para o estado de convergência (não repete).
    const zeroed = visibleTabs.length === 0 && !!filtro
    const prevZeroed = useRef(false)
    useEffect(() => {
        if (zeroed && !prevZeroed.current) {
            playErrorSound()
        }
        prevZeroed.current = zeroed
    }, [zeroed])

    const handleSuggestionClick = (prompt: IAPromptList) => {
        promptOnClick('executar', prompt)
    }

    return (
        <>
            <ProcessFilters
                singleExecutablePrompt={singleExecutablePrompt}
                onExecute={(row) => promptOnClick('executar', row)}
            />
            {!apiKeyProvided && (
                <Container className="mt-2 mb-3" fluid={false}>
                    <p className="text-center mt-3 mb-3">
                        Execute os prompts diretamente na Apoia, cadastrando sua <ModeLink prefetch={false} href="/prefs">Chave de API</ModeLink>.
                    </p>
                </Container>
            )}

            {faseAtual && suggestedPrompts.length > 0 && (
                <div className="bg-warning bg-opacity-25 pb-3 pt-3">
                    <Container className="" fluid={false}>
                        <SuggestionCards
                            faseAtual={faseAtual}
                            promptsSugeridos={suggestedPrompts}
                            onPromptClick={handleSuggestionClick}
                        />
                    </Container>
                </div>
            )}

            <Container className="mt-2 mb-3" fluid={false}>
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k || 'principal')}
                    className="mt-3"
                >
                    <Tab eventKey="principal" title={<span><u>P</u>rincipais</span>} tabAttrs={{ accessKey: "p", style: principalVisible ? undefined : { display: 'none' } }}>
                        <PromptsTable
                            prompts={promptsPrincipais}
                            onClick={promptOnClick}
                            onProcessNumberChange={setNumeroDoProcesso}
                            isModerator={isModerator}
                            onFilteredChange={handleFiltered('principal')}
                        >
                            {CriarNovo()}
                        </PromptsTable>
                    </Tab>

                    <Tab eventKey="comunidade" title={<span>Prompts Não <u>A</u>valiados</span>} tabAttrs={{ accessKey: "a", style: comunidadeVisible ? undefined : { display: 'none' } }}>
                        <PromptsTable
                            prompts={promptsComunidade}
                            onClick={promptOnClick}
                            onProcessNumberChange={setNumeroDoProcesso}
                            isModerator={isModerator}
                            onFilteredChange={handleFiltered('comunidade')}
                        >
                            {CriarNovo()}
                        </PromptsTable>

                        <div className="alert alert-warning mt-3">
                            <p className="mb-0">
                                <strong>Atenção:</strong> Os prompts da comunidade são compartilhados publicamente por outros usuários.
                                Esses prompts não passam por nenhum tipo de validação e podem gerar respostas imprecisas,
                                inconsistentes ou inadequadas para seu contexto.
                            </p>
                        </div>
                    </Tab>
                </Tabs>
            </Container>
        </>
    )
}

function CriarNovo() {
    const modeUrl = useModeUrl()
    return (
        <div className="col col-auto mt-3">
            <DropdownButton id="criar-novo-dropdown" title="Criar Novo" variant="primary">
                <Dropdown.Item href={modeUrl('/prompts/prompt/new')}>Prompt</Dropdown.Item>
                <Dropdown.Item href={modeUrl('/prompts/prompt/new?template=true&import=true')}>
                    Prompt a partir de um modelo pré-existente
                </Dropdown.Item>
                <Dropdown.Item href={modeUrl('/prompts/prompt/new?template=true')}>
                    Prompt a partir de um modelo no padrão da Apoia
                </Dropdown.Item>
            </DropdownButton>
        </div>
    )
}
