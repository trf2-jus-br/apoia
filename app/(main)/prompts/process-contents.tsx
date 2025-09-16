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
        const startTime = new Date()
        if (selectedPieces.length === 0) return
        const cache = pieceContent
        const loading = {}
        const contents = {}
        for (const peca of selectedPieces) {
            if (cache[peca.id])
                contents[peca.id] = cache[peca.id]
            else
                loading[peca.id] = fetch(`/api/v1/process/${dadosDoProcesso.numeroDoProcesso}/piece/${peca.id}/content`)
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
        setRequests(buildRequests(contents))
    }

    const LoadingPieces = () => {
        if (loadingPiecesProgress === -1 || selectedPieces.length === 0) return null
        return <>Carregando Peças...<ProgressBar variant="primary" striped={true} now={loadingPiecesProgress / selectedPieces.length * 100} label={`${loadingPiecesProgress}/${selectedPieces.length}`} /></>
        return <div className="alert alert-info mt-4">{`Carregando peça ${loadingPiecesProgress} de ${selectedPieces.length}`}</div>
    }

    const buildRequests = (contents: { [key: number]: string }): GeneratedContent[] => {
        const requestArray: GeneratedContent[] = []
        const pecasComConteudo: TextoType[] = selectedPieces.map(peca => ({ id: peca.id, event: peca.numeroDoEvento, idOrigem: peca.idOrigem, label: peca.rotulo, descr: peca.descr, slug: slugify(peca.descr), texto: contents[peca.id], sigilo: peca.sigilo }))
        let produtos: InfoDeProduto[] = []
        // Internal seeded prompt: use map products
        if (prompt.kind?.startsWith('^')) {
            const key = prompt.kind.substring(1)
            const def = TipoDeSinteseMap[key]
            if (def) {
                produtos = def.produtos.map(p => infoDeProduto(p))
            }
            // If products list is defined via TipoDeSinteseMap, append them (avoids double-adding chat if not desired later)
            for (const ip of produtos) {
                if (ip.produto === P.RESUMOS) {
                    // Add resume for each piece
                    for (const peca of pecasComConteudo) {
                        const definition = getInternalPrompt(`resumo-${peca.slug}`)
                        const data: PromptDataType = { textos: [peca] }
                        requestArray.push({ documentCode: peca.id || null, documentDescr: peca.descr, documentLocation: peca.event, documentLink: `/api/v1/process/${dadosDoProcesso.numeroDoProcesso}/piece/${peca.id}/binary`, data, title: peca.descr, produto: ip.produto, promptSlug: definition.kind, internalPrompt: definition })
                    }
                    continue
                }
                const def = getInternalPrompt(ip.prompt)
                if (!def) continue
                const data: PromptDataType = { numeroDoProcesso: dadosDoProcesso.numeroDoProcesso, textos: pecasComConteudo }
                requestArray.push({ documentCode: null, documentDescr: null, data, title: ip.titulo, produto: ip.produto, promptSlug: def.kind, internalPrompt: def })
            }
        } else {
            if (prompt.content.summary === 'SIM') {
                for (const peca of pecasComConteudo) {
                    const definition = getInternalPrompt(`resumo-${peca.slug}`)
                    const data: PromptDataType = {
                        numeroDoProcesso: dadosDoProcesso.numeroDoProcesso,
                        textos: [peca]
                    }
                    requestArray.push({ documentCode: peca.id || null, documentDescr: peca.descr, documentLocation: peca.event, documentLink: `/api/v1/process/${dadosDoProcesso.numeroDoProcesso}/piece/${peca.id}/binary`, data, title: peca.descr, produto: P.RESUMO_PECA, promptSlug: definition.kind, internalPrompt: definition })
                }
            }
            const definition: PromptDefinitionType = {
                kind: `prompt-${prompt.id}`,
                prompt: prompt.content.prompt,
                systemPrompt: prompt.content.system_prompt,
                jsonSchema: prompt.content.json_schema,
                format: prompt.content.format,
                template: prompt.content.template,
                cacheControl: true,
            }
            const req: GeneratedContent = {
                documentCode: null,
                documentDescr: null,
                data: {
                    numeroDoProcesso: dadosDoProcesso.numeroDoProcesso,
                    textos: pecasComConteudo
                },
                produto: P.RESUMO,
                promptSlug: slugify(prompt.name),
                internalPrompt: definition,
                title: prompt.name,
                plugins: []
            }
            requestArray.push(req)

            // Basic chat as last item
            const definition2 = getInternalPrompt(`chat`)
            const data: PromptDataType = { textos: pecasComConteudo }
            requestArray.push({ documentCode: null, documentDescr: null, data, title: 'Chat', produto: P.CHAT, promptSlug: definition2.kind, internalPrompt: definition2 })
        }

        return requestArray
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
                        <ListaDeProdutos dadosDoProcesso={dadosDoProcesso} requests={requests} />
                        <Print numeroDoProcesso={dadosDoProcesso.numeroDoProcesso} />
                    </>
                    : <PromptParaCopiar dadosDoProcesso={dadosDoProcesso} requests={requests} />
            )}</>}
        <hr className="mt-5" />
        <p style={{ textAlign: 'center' }}>Este documento foi gerado pela Apoia, ferramenta de inteligência artificial desenvolvida exclusivamente para facilitar a triagem de acervo, e não substitui a elaboração de relatório específico em cada processo, a partir da consulta manual aos eventos dos autos. Textos gerados por inteligência artificial podem conter informações imprecisas ou incorretas.</p>
        <p style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: `O prompt ${prompt.name} (${prompt.id}) ${buildFooterFromPieces(model, (selectedPieces || []).map(p => ({ ...p, conteudo: pieceContent[p.id] })))?.toLowerCase()}` }} />
    </div >
}
