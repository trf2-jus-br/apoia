'use client'

import { createContext, useContext, ReactNode, useMemo } from 'react'
import { IAPromptList, IALibrary } from '@/lib/db/mysql-types'
import { DadosDoProcessoType, InstanceKeyType } from '@/lib/proc/process-types'
import { useProcessData } from '../hooks/useProcessData'
import { usePromptState } from '../hooks/usePromptState'
import { SinkFromURLType, SourcePayloadType } from '@/lib/utils/messaging'

interface PromptContextValue {
    // Process Data
    numeroDoProcesso: string | null
    setNumeroDoProcesso: (numero: string | null) => void
    arrayDeDadosDoProcesso: DadosDoProcessoType[] | null
    dadosDoProcesso: DadosDoProcessoType | null
    idxProcesso: number
    setIdxProcesso: (idx: number) => void
    setDadosDoProcesso: (dados: DadosDoProcessoType | null) => void
    number: string
    setNumber: (number: string) => void
    faseAtual: string | undefined
    fases: string[] | undefined

    // Prompt State
    prompts: IAPromptList[]
    setPrompts: (prompts: IAPromptList[]) => void
    prompt: IAPromptList | null
    setPrompt: (prompt: IAPromptList | null) => void
    scope: string | undefined
    setScope: (scope: string | undefined) => void
    instance: InstanceKeyType | undefined
    setInstance: (instance: InstanceKeyType | undefined) => void
    matter: string | undefined
    setMatter: (matter: string | undefined) => void
    activeTab: string
    setActiveTab: (tab: string) => void
    pieceContent: any
    setPieceContent: (content: any) => void
    source: string | null
    setSource: (source: string | null) => void
    sinkFromURL: SinkFromURLType | null
    setSinkFromURL: (sink: SinkFromURLType | null) => void
    sinkButtonText: string | null
    setSinkButtonText: (message: string | null) => void
    allLibraryDocuments: IALibrary[]
    promptInitialized: boolean
    sourcePayload: SourcePayloadType | null
    setSourcePayload: (payload: SourcePayloadType | null) => void
    replacePiecesParam: (numbersOrNull: number[] | null) => void
    maxConfidentialityLevel: number
    group: string | null
    setGroup: (group: string | null) => void
    action: string | null
    setAction: (action: string | null) => void
    suggestedPrompts: IAPromptList[]
    execution_id: string
    isBetaTester: boolean
    mode: string
}

const PromptContext = createContext<PromptContextValue | undefined>(undefined)

interface PromptProviderProps {
    children: ReactNode
    originalPrompts: IAPromptList[]
    toastMessage: (message: string, variant: string) => void
    maxConfidentialityLevel: number
    sidekick?: boolean
    isBetaTester?: boolean
    mode?: string
}

export function PromptProvider({ children, originalPrompts, toastMessage, maxConfidentialityLevel, sidekick, isBetaTester = false, mode = 'JUDICIAL' }: PromptProviderProps) {
    const execution_id = useMemo(() => crypto.randomUUID(), [])
    const processData = useProcessData(toastMessage)
    const {
        numeroDoProcesso,
        setNumeroDoProcesso,
        arrayDeDadosDoProcesso,
        dadosDoProcesso,
        idxProcesso,
        setIdxProcesso,
        setDadosDoProcesso,
        number,
        setNumber,
        setTramFromUrl,
        faseAtual,
        fases
    } = processData

    const promptState = usePromptState(
        originalPrompts,
        numeroDoProcesso,
        idxProcesso,
        arrayDeDadosDoProcesso,
        setNumeroDoProcesso,
        setNumber,
        setDadosDoProcesso as any,
        setDadosDoProcesso,
        setIdxProcesso,
        setTramFromUrl,
        maxConfidentialityLevel,
        sidekick,
        faseAtual,
        dadosDoProcesso
    )

    const value = useMemo(() => ({
        // Process Data
        numeroDoProcesso,
        setNumeroDoProcesso,
        arrayDeDadosDoProcesso,
        dadosDoProcesso,
        idxProcesso,
        setIdxProcesso,
        setDadosDoProcesso,
        number,
        setNumber,
        faseAtual,
        fases,

        // Prompt State
        ...promptState,

        execution_id,

        isBetaTester,

        mode,
    }), [
        numeroDoProcesso,
        setNumeroDoProcesso,
        arrayDeDadosDoProcesso,
        dadosDoProcesso,
        idxProcesso,
        setIdxProcesso,
        setDadosDoProcesso,
        number,
        setNumber,
        faseAtual,
        fases,
        promptState,
        execution_id,
        isBetaTester,
        mode,
    ])

    return (
        <PromptContext.Provider value={value}>
            {children}
        </PromptContext.Provider>
    )
}

export function usePromptContext() {
    const context = useContext(PromptContext)
    if (context === undefined) {
        throw new Error('usePromptContext must be used within a PromptProvider')
    }
    return context
}

/** Returns the execution_id from PromptContext, or null if not inside a PromptProvider. */
export function useExecutionId(): string | null {
    return useContext(PromptContext)?.execution_id ?? null
}

/** Returns the id of the currently selected (aggregator) prompt, or null if not inside a PromptProvider. */
export function useSelectedPromptId(): number | null {
    return useContext(PromptContext)?.prompt?.id ?? null
}
