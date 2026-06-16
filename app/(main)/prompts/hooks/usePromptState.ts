import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { IAPromptList, IALibrary } from "@/lib/db/mysql-types"
import { slugify } from "@/lib/utils/utils"
import { decodeEnumParam, filterPrompts, findPromptFromParam } from "../utils/promptFilters"
import { Instance, InstanceKeyType, Matter, Scope } from "@/lib/proc/process-types"
import { html2md } from "@/lib/utils/html2md"
import { SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT, SourceMessageFromParentType, SourceMessageToParentType, SinkFromURLType, SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT, SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT_AUTOMATICALLY, SinkMessageToParentType, SinkMessageFromParentType, SourcePayloadType, PromptsMessageToParentType, PromptsMessageFromParentType } from "@/lib/utils/messaging"
import devLog from "@/lib/utils/log"
import { formatEprocStandardToHtml } from "@/lib/utils/messaging-helper"
import { GrupoDeSinteseMap } from "@/lib/proc/combinacoes"

export interface UsePromptStateResult {
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
}

export function usePromptState(
    originalPrompts: IAPromptList[],
    numeroDoProcesso: string | null,
    idxProcesso: number,
    arrayDeDadosDoProcesso: any[] | null,
    setNumeroDoProcesso: (numero: string | null) => void,
    setNumber: (number: string) => void,
    setArrayDeDadosDoProcesso: (array: any[] | null) => void,
    setDadosDoProcesso: (dados: any | null) => void,
    setIdxProcesso: (idx: number) => void,
    setTramFromUrl: (tram: number | null) => void,
    maxConfidentialityLevel: number,
    sidekick?: boolean,
    faseAtual?: string,
    dadosDoProcesso?: any
): UsePromptStateResult {
    const currentSearchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const lastQueryRef = useRef<string>('')
    const [prompts, setPrompts] = useState<IAPromptList[]>(originalPrompts)
    const [prompt, setPrompt] = useState<IAPromptList | null>(null)
    const [scope, setScope] = useState<string | undefined>()
    const [instance, setInstance] = useState<InstanceKeyType | undefined>()
    const [matter, setMatter] = useState<string | undefined>()
    const [promptInitialized, setPromptInitialized] = useState(false)
    const [pieceContent, setPieceContent] = useState({})
    const [allLibraryDocuments, setAllLibraryDocuments] = useState<IALibrary[]>([])
    const [activeTab, setActiveTab] = useState<string>('principal')
    const [sourceFromURL, setSourceFromURL] = useState<string | null>(null)
    const [sinkFromURL, setSinkFromURL] = useState<SinkFromURLType | null>(null)
    const [sinkButtonText, setSinkButtonText] = useState<string | null>(null)
    const [source, setSource] = useState<string | null>(null)
    const [sourcePayload, setSourcePayload] = useState<SourcePayloadType | null>(null)
    const [group, setGroup] = useState<string | null>(null)
    const [action, setAction] = useState<string | null>(null)
    const [suggestedPrompts, setSuggestedPrompts] = useState<IAPromptList[]>([])
    const hasRunSource = useRef(false)
    const hasRunSink = useRef(false)
    const hasRunPrompts = useRef(false)

    const PIECES_PARAM = 'pieces' // stores hyphen-separated 1-based indices (1..N) in original allPieces order

    const canonicalNumbers = (numbers: number[]) => Array.from(new Set(numbers.filter(n => Number.isInteger(n) && n >= 1))).sort((a, b) => a - b).join('-')

    const replacePiecesParam = (numbersOrNull: number[] | null) => {
        // Build new query string preserving other params
        const params = new URLSearchParams(currentSearchParams.toString())
        if (numbersOrNull && numbersOrNull.length > 0) {
            const value = canonicalNumbers(numbersOrNull)
            if (params.get(PIECES_PARAM) !== value) {
                params.set(PIECES_PARAM, value)
            }
        } else {
            if (params.has(PIECES_PARAM)) params.delete(PIECES_PARAM)
        }
        const qs = params.toString()
        const url = qs ? `${pathname}?${qs}` : pathname
        router.replace(url, { scroll: false })
    }

    useEffect(() => {
        const loadLibraryDocuments = async () => {
            try {
                const response = await fetch('/api/v1/library')
                if (response.ok) {
                    const data = await response.json()
                    const documents = data?.items || data || []
                    setAllLibraryDocuments(documents)
                }
            } catch (error) {
                console.error('Error loading library documents:', error)
            }
        }
        loadLibraryDocuments()
    }, [])

    useEffect(() => {
        if (promptInitialized) return

        const p = currentSearchParams.get('prompt')
        const proc = currentSearchParams.get('process')
        const sc = currentSearchParams.get('scope')
        const inst = currentSearchParams.get('instance')
        const mat = currentSearchParams.get('matter')
        const tram = currentSearchParams.get('tram')
        const tab = currentSearchParams.get('tab')
        const sourceFromURL = currentSearchParams.get('source')
        const sinkFromURL = currentSearchParams.get('sink') as SinkFromURLType
        const sinkButtonText = currentSearchParams.get('sink-button-text')
        const groupFromURL = currentSearchParams.get('group')
        const actionFromURL = currentSearchParams.get('action')

        if (p) {
            const found = findPromptFromParam(prompts, p)
            if (found) setPrompt(found)
        }

        // Verifica se o group é válido (slug existe no GrupoDeSinteseMap)
        if (groupFromURL) {
            const isValidGroup = Object.values(GrupoDeSinteseMap).some(
                g => g.slug === groupFromURL
            )
            if (isValidGroup) setGroup(groupFromURL)
        }

        if (proc && proc.length === 20) {
            setNumeroDoProcesso(proc)
            setNumber(proc)
        }

        const scName = decodeEnumParam(sc, Scope)
        const instName = decodeEnumParam(inst, Instance)
        const matName = decodeEnumParam(mat, Matter)

        if (scName) setScope(scName)
        if (instName) setInstance(instName as InstanceKeyType)
        if (matName) setMatter(matName)
        if (tram && /^\d+$/.test(tram)) setTramFromUrl(parseInt(tram))
        if (tab === 'comunidade') setActiveTab('comunidade')
        if (sourceFromURL) setSourceFromURL(sourceFromURL)
        if (sinkFromURL) setSinkFromURL(sinkFromURL)
        if (sinkButtonText) setSinkButtonText(sinkButtonText)
        if (actionFromURL) setAction(actionFromURL)
        setPromptInitialized(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!parent || !prompts || !prompts.length) return

        devLog('*** Sending prompts')
        if (hasRunPrompts.current) return
        hasRunPrompts.current = true
        parent.postMessage({ type: 'get-prompts', payload: { prompts } } satisfies PromptsMessageToParentType, '*')

        // Listener para mensagem do popup
        const handleMessage = (event: MessageEvent) => {
            switch (event.data?.type) {
                case 'set-prompts':
                    const receivedPrompts = (event.data as PromptsMessageFromParentType).payload.prompts
                    if (Array.isArray(receivedPrompts) && receivedPrompts.length > 0) {
                        const promptsMap = new Map(prompts.map(p => [p.id, p]))
                        const list = []
                        for (const p of receivedPrompts) {
                            if (p.id != null && promptsMap.has(p.id)) {
                                list.push({ ...promptsMap.get(p.id), is_hidden: p.is_hidden })
                            }
                        }
                        setPrompts(list)
                    }
            }
        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [prompts])

    useEffect(() => {
        if (!sidekick && prompt && prompt.content?.target && prompt.content.target !== 'PROCESSO') {
            if (numeroDoProcesso) setNumeroDoProcesso(null)
            if (arrayDeDadosDoProcesso) setArrayDeDadosDoProcesso(null)
            if (setDadosDoProcesso) setDadosDoProcesso(null)
            if (idxProcesso !== 0) setIdxProcesso(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt])

    // Fase 5: Seleção automática de prompt baseada na fase processual
    useEffect(() => {
        // Só executa se temos dados do processo e fase detectada
        if (!dadosDoProcesso || !faseAtual || !promptInitialized) {
            if (suggestedPrompts.length > 0) setSuggestedPrompts([])
            return
        }

        // Filtra prompts pela fase processual
        const candidatosPorFase = prompts.filter(p => {
            const phases = p.content?.phase
            return phases && Array.isArray(phases) && phases.includes(faseAtual)
        })

        // const promptsSugeridos = candidatosPorFase

        // Para [Processos Agregados] (classe === '[Processos Agregados]'), não aplicamos
        // o filtro de scope/instance/matter, pois os dados são combinados de múltiplos
        // processos e não há um valor único significativo para esses atributos.
        const isProcessoAgregado = dadosDoProcesso.classe === '[Processos Agregados]'

        const promptsFiltrados = isProcessoAgregado
            ? candidatosPorFase
            : filterPrompts(candidatosPorFase, {
                scope: dadosDoProcesso.segmento,
                instance: dadosDoProcesso.instancia as InstanceKeyType | undefined,
                matter: dadosDoProcesso.materia
            })

        const promptsSugeridos = promptsFiltrados.slice(0, 3)

        // Atualiza o estado
        setSuggestedPrompts(promptsSugeridos)

        // Não seleciona automaticamente se já há um prompt selecionado que não seja o padrão
        if (prompt && prompt.slug && prompt.slug !== 'resumo') return

        // Busca o primeiro prompt que tenha a fase atual no campo phase
        const promptParaFase = promptsSugeridos.length > 0 ? promptsSugeridos[0] : null

        if (prompt?.slug === 'resumo') {
            if (promptParaFase) {
                setPrompt(promptParaFase)
            } else {
                // Fallback: usa o prompt "resumo" se não encontrar nenhum para a fase
                const promptResumo = prompts.find(p => p.slug === 'resumo')
                if (promptResumo) {
                    setPrompt(promptResumo)
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [faseAtual, dadosDoProcesso, promptInitialized, prompts])

    useEffect(() => {
        if (!promptInitialized) return

        const params = new URLSearchParams(currentSearchParams.toString())

        if (prompt) {
            if (prompt.origin) {
                params.set('prompt', slugify(prompt.slug))
            } else if (prompt.base_id != null) {
                params.set('prompt', String(prompt.base_id))
            }
        } else {
            params.delete('prompt')
        }

        if (numeroDoProcesso?.length === 20) params.set('process', numeroDoProcesso)
        else params.delete('process')

        if (arrayDeDadosDoProcesso?.length > 1) {
            const defaultIdx = arrayDeDadosDoProcesso.length - 1
            if (idxProcesso !== defaultIdx) params.set('tram', String(idxProcesso))
            else params.delete('tram')
        } else {
            params.delete('tram')
        }

        if (scope) params.set('scope', slugify(scope))
        else params.delete('scope')

        if (instance) params.set('instance', slugify(instance))
        else params.delete('instance')

        if (matter) params.set('matter', slugify(matter))
        else params.delete('matter')

        if (activeTab === 'comunidade') params.set('tab', 'comunidade')
        else params.delete('tab')

        if (group) {
            params.set('group', group)
        } else {
            params.delete('group')
        }

        if (!prompt || !numeroDoProcesso) {
            params.delete('pieces')
        }

        if (action) params.set('action', action)
        else params.delete('action')

        const qs = params.toString()
        if (qs === lastQueryRef.current) return

        lastQueryRef.current = qs
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, [prompt, numeroDoProcesso, idxProcesso, scope, instance, matter, activeTab, group, arrayDeDadosDoProcesso, action, promptInitialized, pathname, router, currentSearchParams])

    useEffect(() => {
        if (!parent || !prompt) return
        if (prompt.content?.target !== 'TEXTO' && prompt.content?.target !== 'REFINAMENTO') return

        devLog('*** Source from URL:', sourceFromURL)
        // if (sourceFromURL !== SOURCE_PARAM_THAT_INDICATES_TO_RETRIEVE_USING_MESSAGE_TO_PARENT) return

        // Previne execução dupla em desenvolvimento (React 18 Strict Mode)
        // if (hasRunSource.current) return
        // hasRunSource.current = true
        parent.postMessage({ type: 'get-source', payload: { promptSlug: prompt?.slug, promptType: prompt?.content?.target ? slugify(prompt.content.target) : undefined } } satisfies SourceMessageToParentType, '*')

        // Listener para mensagem do popup
        const handleMessage = (event: MessageEvent) => {
            switch (event.data?.type) {
                case 'set-source':
                    const receivedMessage = event.data as SourceMessageFromParentType
                    setSourcePayload(receivedMessage.payload)
                    if (receivedMessage.payload.markdownContent) {
                        const markdownContent = receivedMessage.payload.markdownContent
                        setSource(markdownContent)
                        devLog(`Received source from parent message.\n\n${markdownContent}`)
                    } else if (receivedMessage.payload.htmlContent) {
                        let content = receivedMessage.payload.htmlContent
                        content = formatEprocStandardToHtml(content)
                        const markdownContent = html2md(content)
                        setSource(markdownContent)
                        devLog(`Converted HTML to Markdown source from parent message.\n\n${markdownContent}`)
                    } else {
                        devLog('No content received in set-source message from parent.')
                    }
            }
        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [sourceFromURL, prompt])

    useEffect(() => {
        if (!parent) return

        devLog('*** Sink from URL:', sinkFromURL)
        if (sinkFromURL === SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT || sinkFromURL === SINK_PARAM_THAT_INDICATES_TO_SEND_AS_A_MESSAGE_TO_PARENT_AUTOMATICALLY) return

        if (!prompt?.origin || !['sentenca', 'voto', 'refinamento-de-texto', 'revisao-de-texto'].includes(prompt?.slug || '')) return

        // // Previne execução dupla em desenvolvimento (React 18 Strict Mode)
        // if (hasRunSink.current) return
        // hasRunSink.current = true
        parent.postMessage({ type: 'get-sink', payload: { promptSlug: prompt?.slug } } satisfies SinkMessageToParentType, '*')

        // Listener para mensagem do popup
        const handleMessage = (event: MessageEvent) => {
            switch (event.data?.type) {
                case 'set-sink':
                    const receivedMessage = event.data as SinkMessageFromParentType
                    setSinkFromURL(receivedMessage.payload.kind as SinkFromURLType)
                    setSinkButtonText(receivedMessage.payload.buttonText ?? '')
            }
        }
        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [sinkFromURL, prompt])

    return {
        prompts,
        setPrompts,
        prompt,
        setPrompt,
        scope,
        setScope,
        instance,
        setInstance,
        matter,
        setMatter,
        activeTab,
        setActiveTab,
        pieceContent,
        setPieceContent,
        source,
        setSource,
        sinkFromURL,
        setSinkFromURL,
        sinkButtonText,
        setSinkButtonText,
        allLibraryDocuments,
        promptInitialized,
        sourcePayload,
        setSourcePayload,
        replacePiecesParam,
        maxConfidentialityLevel,
        group,
        setGroup,
        action,
        setAction,
        suggestedPrompts
    }
}
