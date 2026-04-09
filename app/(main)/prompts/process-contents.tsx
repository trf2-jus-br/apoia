'use client'

import { IALibrary, IALibraryInclusion, IAPrompt } from "@/lib/db/mysql-types";
import { PecaType, TEXTO_PECA_COM_ERRO } from "@/lib/proc/process-types";
import { ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PieceStrategy, selecionarPecasPorPadraoComFase, T } from "@/lib/proc/combinacoes";
import { GeneratedContent } from "@/lib/ai/prompt-types";
import { ProgressBar } from "react-bootstrap";
import Print from "@/components/slots/print";
import Subtitulo from "@/components/slots/subtitulo";
import ChoosePieces from "./choose-pieces";
import ChooseLibrary from "./choose-library";
import ErrorMsg from "./error-msg";
import { ListaDeProdutos } from "@/components/slots/lista-produtos-client";
import { PromptParaCopiar } from "./prompt-to-copy";
import { buildFooterFromPieces } from "@/lib/utils/footer";
import { formatDateTime } from "@/lib/utils/date";
import { serverBuildRequests } from "@/lib/ai/prompt-actions";
import { usePromptContext } from "./context/PromptContext";
import Listen from "@/components/slots/listen";

// Helper function to check confidentiality level on client side
const isNivelDeSigiloPermitidoClient = (maxConfidentialityLevel: number, nivel: string): boolean => {
    const n = parseInt(nivel)
    return n <= maxConfidentialityLevel
}

export default function ProcessContents({ apiKeyProvided, model, children, sidekick, promptButtons }: {
    apiKeyProvided: boolean,
    model?: string,
    children?: ReactNode,
    sidekick?: boolean
    promptButtons?: ReactNode
}) {
    const {
        prompt,
        dadosDoProcesso,
        pieceContent,
        setPieceContent,
        allLibraryDocuments,
        sinkFromURL,
        sinkButtonText,
        sourcePayload,
        maxConfidentialityLevel
    } = usePromptContext()

    if (!prompt || !dadosDoProcesso) return null
    const [selectedPieces, setSelectedPieces] = useState<PecaType[] | null>(null)
    const [defaultPieceIds, setDefaultPieceIds] = useState<string[] | null>(null)
    const [selectedLibraryDocuments, setSelectedLibraryDocuments] = useState<IALibrary[] | null>(null)
    const [defaultLibraryDocumentIds, setDefaultLibraryDocumentIds] = useState<string[] | null>(null)
    const [loadingPiecesProgress, setLoadingPiecesProgress] = useState(-1)
    const [requests, setRequests] = useState<GeneratedContent[]>([])
    const [readyToStartAI, setReadyToStartAI] = useState(false)
    const [choosingPieces, setChoosingPieces] = useState(!(sidekick && prompt?.slug === 'chat' && !!prompt?.origin))
    const [choosingLibrary, setChoosingLibrary] = useState(false)
    const searchParams = useSearchParams()
    const isBetaTester = document.cookie.includes('beta-tester=2') || null

    const changeSelectedPieces = (pieces: string[]) => {
        setSelectedPieces(dadosDoProcesso.pecas.filter(p => pieces.includes(p.id)))
    }

    const changeSelectedLibraryDocuments = (documentIds: string[]) => {
        setSelectedLibraryDocuments((allLibraryDocuments || []).filter(d => documentIds.includes(d.id.toString())))
    }

    const chooseSelectedPieces = (allPieces: PecaType[], pieceStrategy: string, pieceDescr: string[]) => {
        // If it's an internal seeded prompt, prefer piece_strategy from DB content
        if (prompt.origin) {
            const dbPieceStrategy = prompt.content?.piece_strategy
            const strategyName = dbPieceStrategy || pieceStrategy
            if (strategyName) {
                const strategy = PieceStrategy[strategyName]
                if (strategy?.pattern) {
                    const pecasAcessiveis = allPieces.filter(p => isNivelDeSigiloPermitidoClient(maxConfidentialityLevel, p.sigilo))
                    const selecao = selecionarPecasPorPadraoComFase(pecasAcessiveis, strategy.pattern, dadosDoProcesso.movimentosEDocumentos)
                    return selecao.pecas || []
                }
            }
        }
        const pattern = PieceStrategy[pieceStrategy]?.pattern
        if (pattern) {
            const pecasAcessiveis = allPieces.filter(p => isNivelDeSigiloPermitidoClient(maxConfidentialityLevel, p.sigilo))
            const selecao = selecionarPecasPorPadraoComFase(pecasAcessiveis, pattern, dadosDoProcesso.movimentosEDocumentos)
            const pecasSelecionadas = selecao.pecas
            return pecasSelecionadas || []
        }
        const validDescrs = pieceDescr.map(d => T[d] || d)
        return allPieces.filter(p => validDescrs.includes(p.descr))
    }

    const getSelectedPiecesContents = async () => {
        if (!selectedPieces || selectedPieces.length === 0) return
        const cache = pieceContent
        const loading = {}
        const contents = {}
        for (const peca of selectedPieces) {
            if (cache[peca.id])
                contents[peca.id] = cache[peca.id]
            else
                loading[peca.id] = fetch(`/api/v1/process/${peca.numeroDoProcesso || dadosDoProcesso.numeroDoProcesso}/piece/${peca.id}/content`)
        }
        for (const id in loading) {
            setLoadingPiecesProgress(Object.keys(contents).length)
            const resp = await loading[id]
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}))
                if (data.errormsg)
                    contents[id] = `${TEXTO_PECA_COM_ERRO}${data.errormsg ? ` ${data.errormsg}` : ''}`
                continue
            }
            const json = await resp.json()
            if (json.errormsg)
                contents[id] = json.errormsg
            else
                contents[id] = json.content
        }
        setPieceContent(contents)
        setLoadingPiecesProgress(-1)
        setRequests(await serverBuildRequests(prompt, selectedLibraryDocuments?.map(d => d.id.toString()), dadosDoProcesso.numeroDoProcesso, selectedPieces, contents))
        if (prompt.name === 'Chat') setChoosingPieces(false)
    }

    const LoadingPieces = () => {
        if (loadingPiecesProgress === -1 || !selectedPieces || selectedPieces.length === 0) return null
        return <div className="mb-4">Carregando Peças...<ProgressBar variant="primary" striped={true} now={loadingPiecesProgress / selectedPieces.length * 100} label={`${loadingPiecesProgress}/${selectedPieces.length}`} /></div>
    }

    useEffect(() => {
        if (prompt?.slug === 'chat' && prompt?.origin) return
        setReadyToStartAI(false)
        setChoosingPieces(true)
    }, [prompt])

    useEffect(() => {
        if (!dadosDoProcesso?.pecas || dadosDoProcesso.pecas.length === 0) return
        // Compute automatic default selection for baseline
        const autoDefault = chooseSelectedPieces(dadosDoProcesso.pecas, prompt.content.piece_strategy, prompt.content.piece_descr)
        setDefaultPieceIds(autoDefault.map(p => p.id))
        // If URL has explicit 'pieces' numbers (1-based), prefer them over automatic selection
        // Backward compatibility: fall back to 'pecas' and accept comma or hyphen separators
        const piecesParam = searchParams.get('pieces') || searchParams.get('pecas')
        if (piecesParam) {
            const nums = piecesParam.split(/[,-]/).map(s => parseInt(s.trim(), 10)).filter(n => Number.isInteger(n) && n >= 1)
            if (nums.length) {
                const ids: string[] = nums
                    .map(n => {
                        const idx = n - 1
                        return (idx >= 0 && idx < dadosDoProcesso.pecas.length) ? dadosDoProcesso.pecas[idx].id : null
                    })
                    .filter((v): v is string => !!v)
                const uniqueIds = Array.from(new Set(ids))
                const sel = dadosDoProcesso.pecas.filter(p => uniqueIds.includes(p.id))
                setSelectedPieces(sel)
                return
            }
        } else {
            // Fallback to automatic selection only if we don't have a selection yet
            // if (!selectedPieces || selectedPieces.length === 0) {
            setSelectedPieces(autoDefault)
            // }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt, dadosDoProcesso.pecas, searchParams])

    useEffect(() => {
        if (!allLibraryDocuments || !Array.isArray(allLibraryDocuments) || allLibraryDocuments.length === 0) return

        // Compute automatic default selection for baseline (documents with inclusion === SIM)
        const autoDefault = allLibraryDocuments.filter(d => d.inclusion === IALibraryInclusion.SIM)
        setDefaultLibraryDocumentIds(autoDefault.map(d => d.id.toString()))

        // If URL has explicit 'library' IDs (hyphen-separated), prefer them over automatic selection
        const libraryParam = searchParams.get('library')

        if (libraryParam !== null) {
            const ids = (libraryParam || '').split(/[,-]/).map(s => s.trim()).filter(id => id)
            const uniqueIds = Array.from(new Set(ids))
            const sel = allLibraryDocuments.filter(d => uniqueIds.includes(d.id.toString()))
            setSelectedLibraryDocuments(sel)
            return
        }

        // Always set the auto default (either autoDefault or empty array if no documents with inclusion=SIM)
        setSelectedLibraryDocuments(autoDefault)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allLibraryDocuments, searchParams])

    useEffect(() => {
        setLoadingPiecesProgress(0)
        // Clear previous requests to avoid proceeding with stale results
        setRequests([])
        getSelectedPiecesContents()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPieces])

    useEffect(() => {
        if (requests && requests.length && !choosingPieces && !choosingLibrary) {
            setReadyToStartAI(true)
        }
    }, [choosingPieces, choosingLibrary, requests])

    // const TramitacaoTitle = ({ classe }: { classe: string }) => <div className="text-body-tertiary text-center h-print">Tramitação: {classe} - <span onClick={() => { return }} className="text-primary" style={{ cursor: 'pointer' }}><FontAwesomeIcon icon={faEdit} /> Alterar</span></div>

    return <div>
        {sidekick ? null : <Subtitulo dadosDoProcesso={dadosDoProcesso} />}
        {children}
        {allLibraryDocuments && Array.isArray(allLibraryDocuments) && allLibraryDocuments.length > 0 && selectedLibraryDocuments !== null && <>
            <ChooseLibrary
                allDocuments={allLibraryDocuments}
                selectedDocuments={selectedLibraryDocuments}
                onSave={(documentIds) => { setRequests([]); changeSelectedLibraryDocuments(documentIds) }}
                onStartEditing={() => { setChoosingLibrary(true) }}
                onEndEditing={() => setChoosingLibrary(false)}
                readyToStartAI={readyToStartAI}
                baselineDefaultIds={defaultLibraryDocumentIds || []}
            />
        </>}
        {selectedPieces && <>
            <ChoosePieces allPieces={dadosDoProcesso.pecas} selectedPieces={selectedPieces} onSave={(pieces) => { setRequests([]); changeSelectedPieces(pieces) }} onStartEditing={() => { setChoosingPieces(true) }} onEndEditing={() => setChoosingPieces(false)} editing={choosingPieces} dossierNumber={dadosDoProcesso.numeroDoProcesso} readyToStartAI={readyToStartAI} baselineDefaultIds={defaultPieceIds || []} />
            <LoadingPieces />
            <ErrorMsg dadosDoProcesso={dadosDoProcesso} />
            {/* <div className="mb-4"></div> */}
            {readyToStartAI && requests?.length > 0 && (
                apiKeyProvided
                    ? <>
                        <ListaDeProdutos dadosDoProcesso={dadosDoProcesso} requests={requests} model={model} sidekick={sidekick} promptButtons={promptButtons} sinkFromURL={sinkFromURL} sinkButtonText={sinkButtonText} />
                        {!sidekick && <div className="d-flex flex-row justify-content-end gap-2">
                            {isBetaTester && <Listen />}
                            <Print numeroDoProcesso={dadosDoProcesso.numeroDoProcesso} />
                        </div>}
                    </>
                    : <PromptParaCopiar dadosDoProcesso={dadosDoProcesso} requests={requests} />
            )}</>}
        {!sidekick && <>
            <hr className="mt-5 h-listen" />
            <p className="h-listen" style={{ textAlign: 'center' }}>Este documento foi gerado pela Apoia, ferramenta de inteligência artificial desenvolvida exclusivamente para facilitar a triagem de acervo, e não substitui a elaboração de relatório específico em cada processo, a partir da consulta manual aos eventos dos autos. Textos gerados por inteligência artificial podem conter informações imprecisas ou incorretas.</p>
            <p className="h-listen" style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: `O prompt ${prompt.name} (${prompt.id}), em ${formatDateTime(new Date().toISOString())}, ${buildFooterFromPieces(model, (selectedPieces || []).map(p => ({ ...p, conteudo: pieceContent[p.id] })))?.toLowerCase()}` }} />
        </>}
    </div >
}
