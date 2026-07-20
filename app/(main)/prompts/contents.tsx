'use client'

import { IAPromptList } from "@/lib/db/mysql-types"
import { UserType } from "@/lib/user"
import React, { useEffect, useMemo, useState } from "react"
import { Toast, ToastContainer } from "react-bootstrap"
import ErrorMessage from "@/components/error-message"
import { addGenericCookie, getCookieValue } from "./add-cookie"
import TermosDeUso from "./termos-de-uso"
import { PromptProvider, usePromptContext } from "./context/PromptContext"
import { filterPrompts, getPromptsPrincipais, getPromptsComunidade, getPromptsSidekick } from "./utils/promptFilters"
import { MainView } from "./components/MainView"
import { SidekickView } from "./components/SidekickView"
import { PromptExecutionView } from "./components/PromptExecutionView"
import { GroupView } from "./components/GroupView"
import axios from "axios"

export const copyPromptToClipboard = (prompt: IAPromptList) => {
    let s: string = prompt.content.system_prompt
    s = s ? `# PROMPT DE SISTEMA\n\n${s}\n\n# PROMPT\n\n` : ''
    s += prompt.content.prompt
    navigator.clipboard.writeText(s)
}

function ContentsInner({ user, user_id, apiKeyProvided, model, isModerator, sidekick, toastMessage }: { prompts: IAPromptList[], user: UserType, user_id: number, apiKeyProvided: boolean, model?: string, isModerator: boolean, sidekick?: boolean, toastMessage?: (message: string, variant: string) => void }) {
    const [termosAceitos, setTermosAceitos] = useState<boolean | null>(null)
    const [viewKey, setViewKey] = useState<number>(0)

    const {
        prompts,
        prompt,
        setPrompt,
        numeroDoProcesso,
        setNumeroDoProcesso,
        setNumber,
        scope,
        instance,
        matter,
        setSource,
        setSinkFromURL,
        setSinkButtonText,
        setSourcePayload,
        replacePiecesParam,
        group,
        setGroup,
        action
    } = usePromptContext()

    const [promptsState, setPromptsState] = useState<IAPromptList[]>(prompts)

    // Sincroniza a cópia local de prompts com o valor vindo do contexto, que por
    // sua vez reflete a prop originalPrompts do Server Component. Sem isto, ao
    // trocar o modo (Judicial/Administrativo) e router.refresh() trazer uma nova
    // lista do servidor, promptsState permaneceria com o valor antigo (useState
    // só usa o argumento na primeira renderização) e a UI não atualizaria.
    useEffect(() => {
        setPromptsState(prompts)
    }, [prompts])

    useEffect(() => {
        const fetchCookie = async () => {
            const raw = await getCookieValue('termos-de-uso')
            setTermosAceitos(raw === '1')
        }
        fetchCookie()
    }, [])

    const promptOnClick = async (kind: string, row: any) => {
        switch (kind) {
            case 'executar':
                setPrompt(row)
                if (row.content.target !== 'PROCESSO') {
                    setNumeroDoProcesso(null)
                    setNumber('')
                }
                break
            case 'copiar':
                copyPromptToClipboard(row)
                toastMessage('Prompt copiado para a área de transferência', 'success')
                break
            case 'copiar link para favoritar':
                navigator.clipboard.writeText(`Clique no link abaixo para adicionar o prompt ${row.name} aos favoritos:\n\n${window.location.origin}/prompts/prompt/${row.uuid || row.base_id}/set-favorite`)
                toastMessage('Link copiado para a área de transferência', 'success')
                break
            case 'favoritar':
                try {
                    if (row.action === 'set') {
                        await axios.post(`/api/v1/prompt/${row.uuid}/favorite`)
                    } else if (row.action === 'reset') {
                        await axios.delete(`/api/v1/prompt/${row.uuid}/favorite`)
                    }

                    setPromptsState(prevPrompts =>
                        prevPrompts.map(p =>
                            p.base_id === row.base_id
                                ? {
                                    ...p,
                                    is_favorite: row.action === 'set' ? 1 : 0,
                                    favorite_count: Number(p.favorite_count || 0) + (row.action === 'set' ? 1 : -1)
                                }
                                : p
                        )
                    )

                } catch (error) {
                    console.error('Error updating favorite status:', error)
                    toastMessage('Erro ao atualizar favoritos', 'danger')
                }
                break
            default:
                break
        }
    }

    const resetProcess = () => {
        setNumeroDoProcesso(null)
        setNumber('')
        setSourcePayload(null)
        replacePiecesParam(null)
        setViewKey(vk => vk + 1)
    }

    const resetPrompt = () => {
        // setPrompt(null)
        setPrompt(prompts.find(p => p.slug === 'chat' && !!p.origin) || null)
        setSource(null)
        setSourcePayload(null)
        replacePiecesParam(null)
        setSinkFromURL(null)
        setSinkButtonText(null)
        setViewKey(vk => vk + 1)
    }

    const resetToHome = () => {
        setNumeroDoProcesso(null)
        setNumber('')
        setPrompt(prompts.find(p => p.slug === 'chat-standalone' && !!p.origin) || null)
        setSource(null)
        setSourcePayload(null)
        replacePiecesParam(null)
        setSinkFromURL(null)
        setSinkButtonText(null)
        setViewKey(vk => vk + 1)
    }

    const filteredPromptsBase = useMemo(
        () => filterPrompts(promptsState, { scope, instance, matter }),
        [promptsState, scope, instance, matter]
    )

    const promptsPrincipais = useMemo(
        () => getPromptsPrincipais(filteredPromptsBase),
        [filteredPromptsBase]
    )

    const promptsComunidade = useMemo(
        () => getPromptsComunidade(filteredPromptsBase),
        [filteredPromptsBase]
    )

    const promptsSidekick = useMemo(
        () => getPromptsSidekick(prompts, prompt, numeroDoProcesso, instance, action),
        [prompts, prompt, numeroDoProcesso]
    )

    if (sidekick) {
        if (termosAceitos === false) {
            return <TermosDeUso onAccept={() => { setTermosAceitos(true); addGenericCookie('termos-de-uso', '1', 60 * 60 * 24 * 90) }} />
        }

        return (
            <SidekickView
                key={`sidekick-${viewKey}`}
                apiKeyProvided={apiKeyProvided}
                model={model}
                promptsSidekick={promptsSidekick}
                resetToHome={resetToHome}
                resetProcess={resetProcess}
                resetPrompt={resetPrompt}
            />
        )
    }

    // Callback para quando um prompt do grupo é clicado
    const handleGroupPromptClick = (selectedPrompt: IAPromptList) => {
        setGroup(null)
        setPrompt(selectedPrompt)
    }

    // Se tem grupo selecionado, mostra a view de grupo
    if (group) {
        return (
            <GroupView
                groupSlug={group}
                prompts={prompts}
                onPromptClick={handleGroupPromptClick}
            />
        )
    }

    return !prompt ? (
        <>
            <MainView
                promptsPrincipais={promptsPrincipais}
                promptsComunidade={promptsComunidade}
                promptOnClick={promptOnClick}
                isModerator={isModerator}
                apiKeyProvided={apiKeyProvided}
            />
        </>
    ) : (
        <PromptExecutionView
            apiKeyProvided={apiKeyProvided}
            model={model}
        />
    )
}

export function Contents({ prompts, user, user_id, apiKeyProvided, model, isModerator, sidekick, maxConfidentialityLevel }: { prompts: IAPromptList[], user: UserType, user_id: number, apiKeyProvided: boolean, model?: string, isModerator: boolean, maxConfidentialityLevel: number, sidekick?: boolean }) {
    const [toast, setToast] = useState<string>()
    const [toastVariant, setToastVariant] = useState<string>()

    const toastMessage = (message: string, variant: string) => {
        setToast(message)
        setToastVariant(variant)
    }

    return (
        <PromptProvider originalPrompts={prompts} toastMessage={toastMessage} maxConfidentialityLevel={maxConfidentialityLevel} sidekick={sidekick}>
            <ContentsInner
                prompts={prompts}
                user={user}
                user_id={user_id}
                apiKeyProvided={apiKeyProvided}
                model={model}
                isModerator={isModerator}
                sidekick={sidekick}
                toastMessage={toastMessage}
            />
            <ToastContainer className="p-3" position="bottom-end" style={{ zIndex: 1 }}>
                <Toast onClose={() => setToast('')} show={!!toast} delay={10000} bg={toastVariant} autohide key={toast}>
                    <Toast.Header>
                        <strong className="me-auto">Atenção</strong>
                    </Toast.Header>
                    <Toast.Body className={toastVariant !== 'Light' && 'text-white'}>
                        <ErrorMessage message={toast} />
                    </Toast.Body>
                </Toast>
            </ToastContainer>
        </PromptProvider>
    )
}