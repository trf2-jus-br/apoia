'use client'

import { IAPrompt } from "@/lib/db/mysql-types";
import { DadosDoProcessoType, PecaType, TEXTO_PECA_COM_ERRO } from "@/lib/proc/process-types";
import { ReactNode, useEffect, useState } from "react";
import { InfoDeProduto, P, PieceStrategy, selecionarPecasPorPadraoComFase, T } from "@/lib/proc/combinacoes";
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
    const [selectedPieces, setSelectedPieces] = useState<PecaType[]>([])
    const [loadingPiecesProgress, setLoadingPiecesProgress] = useState(-1)
    const [requests, setRequests] = useState<GeneratedContent[]>([])
    const [readyToStartAI, setReadyToStartAI] = useState(false)
    const [choosingPieces, setChoosingPieces] = useState(false)
    const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);

    const changeSelectedPieces = (pieces: string[]) => {
        setSelectedPieces(dadosDoProcesso.pecas.filter(p => pieces.includes(p.id)))
    }

    const chooseSelectedPieces = (allPieces: PecaType[], pieceStrategy: string, pieceDescr: string[]) => {
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

        const minimumTime = 1500
        const elapsedTime = new Date().getTime() - startTime.getTime()
        if (!minimumTimeElapsed && elapsedTime < minimumTime) {
            await new Promise(resolve => setTimeout(resolve, minimumTime - elapsedTime))
        }
        if (!minimumTimeElapsed)
            setMinimumTimeElapsed(true)
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
        let produtos: (InfoDeProduto | P)[] = []
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

        {
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
        }

        {
            const definition = getInternalPrompt(`chat`)
            const data: PromptDataType = { textos: pecasComConteudo }
            requestArray.push({ documentCode: null, documentDescr: null, data, title: 'Chat', produto: P.CHAT, promptSlug: definition.kind, internalPrompt: definition })
        }

        return requestArray
    }

    useEffect(() => {
        setSelectedPieces(chooseSelectedPieces(dadosDoProcesso.pecas, prompt.content.piece_strategy, prompt.content.piece_descr))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt, dadosDoProcesso.pecas])

    useEffect(() => {
        setLoadingPiecesProgress(0)
        getSelectedPiecesContents()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPieces])

    useEffect(() => {
        if (requests && requests.length && !choosingPieces && minimumTimeElapsed) {
            setReadyToStartAI(true)
        }
    }, [choosingPieces, requests, minimumTimeElapsed])

    const errorLoadingContent = (id: string): string => {
        if (pieceContent[id] && pieceContent[id].startsWith(TEXTO_PECA_COM_ERRO))
            return pieceContent[id]
    }

    return <div>
        <Subtitulo dadosDoProcesso={dadosDoProcesso} />
        {children}
        <ChoosePieces allPieces={dadosDoProcesso.pecas} selectedPieces={selectedPieces} onSave={(pieces) => { setRequests([]); changeSelectedPieces(pieces) }} onStartEditing={() => { setChoosingPieces(true) }} onEndEditing={() => setChoosingPieces(false)} dossierNumber={dadosDoProcesso.numeroDoProcesso} />
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
        )
        }
        <hr className="mt-5" />
        <p style={{ textAlign: 'center' }}>Este documento foi gerado pela Apoia, ferramenta de inteligência artificial desenvolvida exclusivamente para facilitar a triagem de acervo, e não substitui a elaboração de relatório específico em cada processo, a partir da consulta manual aos eventos dos autos. Textos gerados por inteligência artificial podem conter informações imprecisas ou incorretas.</p>
        <p style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: `O prompt ${prompt.name} (${prompt.id}) ${buildFooterFromPieces(model, selectedPieces.map(p => ({ ...p, conteudo: pieceContent[p.id] })))?.toLowerCase()}` }} />
    </div >
}
