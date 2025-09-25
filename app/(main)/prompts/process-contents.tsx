'use client'

import { IAPrompt } from "@/lib/db/mysql-types";
import { DadosDoProcessoType, PecaType, TEXTO_PECA_COM_ERRO } from "@/lib/proc/process-types";
import { ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InfoDeProduto, P, PieceStrategy, selecionarPecasPorPadraoComFase, T, TipoDeSinteseMap } from "@/lib/proc/combinacoes";
import { infoDeProduto } from "@/lib/proc/info-de-produto";
import { GeneratedContent, PromptDataType, PromptDefinitionType, TextoType } from "@/lib/ai/prompt-types";
import { slugify } from "@/lib/utils/utils";
import { getInternalPrompt } from "@/lib/ai/prompt";
import { ProgressBar } from "react-bootstrap";
import Print from "@/components/slots/print";
import Subtitulo from "@/components/slots/subtitulo";
import ChoosePieces from "./choose-pieces";
import ErrorMsg from "./error-msg";
import { ListaDeProdutos } from "@/components/slots/lista-produtos-client";
import { PromptParaCopiar } from "./prompt-to-copy";
import { buildFooterFromPieces } from "@/lib/utils/footer";
import { nivelDeSigiloPermitido } from "@/lib/proc/sigilo";
import { formatDateTime } from "@/lib/utils/date";
import { buildRequests } from "@/lib/ai/build-requests";

export default function ProcessContents({ prompt, dadosDoProcesso, pieceContent, setPieceContent, apiKeyProvided, model, children }: { prompt: IAPrompt, dadosDoProcesso: DadosDoProcessoType, pieceContent: any, setPieceContent: (pieceContent: any) => void, apiKeyProvided: boolean, model?: string, children?: ReactNode }) {
    const [selectedPieces, setSelectedPieces] = useState<PecaType[] | null>(null)
    const [defaultPieceIds, setDefaultPieceIds] = useState<string[] | null>(null)
    const [loadingPiecesProgress, setLoadingPiecesProgress] = useState(-1)
    const [requests, setRequests] = useState<GeneratedContent[]>([])
    const [readyToStartAI, setReadyToStartAI] = useState(false)
    const [choosingPieces, setChoosingPieces] = useState(true)
    const searchParams = useSearchParams()

    const changeSelectedPieces = (pieces: string[]) => {
        setSelectedPieces(dadosDoProcesso.pecas.filter(p => pieces.includes(p.id)))
    }

    const chooseSelectedPieces = (allPieces: PecaType[], pieceStrategy: string, pieceDescr: string[]) => {
        // If it's an internal seeded prompt, prefer map padroes
        if (prompt.kind?.startsWith('^')) {
            const key = prompt.kind.substring(1)
            const def = TipoDeSinteseMap[key]
            if (def) {
                const pecasAcessiveis = allPieces.filter(p => nivelDeSigiloPermitido(p.sigilo))
                const selecao = selecionarPecasPorPadraoComFase(pecasAcessiveis, def.padroes)
                return selecao.pecas || []
            }
        }
        const pattern = PieceStrategy[pieceStrategy].pattern
        if (pattern) {
            const pecasAcessiveis = allPieces.filter(p => nivelDeSigiloPermitido(p.sigilo))
            const selecao = selecionarPecasPorPadraoComFase(pecasAcessiveis, pattern)
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
                contents[id] = TEXTO_PECA_COM_ERRO
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
        setRequests(buildRequests(prompt, dadosDoProcesso.numeroDoProcesso, selectedPieces, contents))
    }

    const LoadingPieces = () => {
        if (loadingPiecesProgress === -1 || !selectedPieces || selectedPieces.length === 0) return null
        return <>Carregando Peças...<ProgressBar variant="primary" striped={true} now={loadingPiecesProgress / selectedPieces.length * 100} label={`${loadingPiecesProgress}/${selectedPieces.length}`} /></>
    }

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
        }
        // Fallback to automatic selection only if we don't have a selection yet
        if (!selectedPieces || selectedPieces.length === 0) {
            setSelectedPieces(autoDefault)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt, dadosDoProcesso.pecas, searchParams])

    useEffect(() => {
        setLoadingPiecesProgress(0)
        // Clear previous requests to avoid proceeding with stale results
        setRequests([])
        getSelectedPiecesContents()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPieces])

    useEffect(() => {
        if (requests && requests.length && !choosingPieces) {
            setReadyToStartAI(true)
        }
    }, [choosingPieces, requests])

    return <div>
        <Subtitulo dadosDoProcesso={dadosDoProcesso} />
        {children}
        {selectedPieces && <>
            <ChoosePieces allPieces={dadosDoProcesso.pecas} selectedPieces={selectedPieces} onSave={(pieces) => { setRequests([]); changeSelectedPieces(pieces) }} onStartEditing={() => { setChoosingPieces(true) }} onEndEditing={() => setChoosingPieces(false)} dossierNumber={dadosDoProcesso.numeroDoProcesso} readyToStartAI={readyToStartAI} baselineDefaultIds={defaultPieceIds || []} />
            <LoadingPieces />
            <ErrorMsg dadosDoProcesso={dadosDoProcesso} />
            <div className="mb-4"></div>
            {readyToStartAI && requests?.length > 0 && (
                apiKeyProvided
                    ? <>
                        <ListaDeProdutos dadosDoProcesso={dadosDoProcesso} requests={requests} model={model} />
                        <Print numeroDoProcesso={dadosDoProcesso.numeroDoProcesso} />
                    </>
                    : <PromptParaCopiar dadosDoProcesso={dadosDoProcesso} requests={requests} />
            )}</>}
        <hr className="mt-5" />
        <p style={{ textAlign: 'center' }}>Este documento foi gerado pela Apoia, ferramenta de inteligência artificial desenvolvida exclusivamente para facilitar a triagem de acervo, e não substitui a elaboração de relatório específico em cada processo, a partir da consulta manual aos eventos dos autos. Textos gerados por inteligência artificial podem conter informações imprecisas ou incorretas.</p>
        <p style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: `O prompt ${prompt.name} (${prompt.id}), em ${formatDateTime(new Date().toISOString())}, ${buildFooterFromPieces(model, (selectedPieces || []).map(p => ({ ...p, conteudo: pieceContent[p.id] })))?.toLowerCase()}` }} />
    </div >
}
