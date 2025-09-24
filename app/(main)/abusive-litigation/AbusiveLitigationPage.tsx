'use client'

import { useState } from 'react'
import AiContent from '@/components/ai-content'
import { Button, Toast } from 'react-bootstrap'
import PromptConfig from '@/components/prompt-config'
import { PromptConfigType, TextoType } from '@/lib/ai/prompt-types'
import { getInternalPrompt, getPiecesWithContent } from '@/lib/ai/prompt'
import fetcher from '@/lib/utils/fetcher'
import { formatBrazilianDate, slugify } from '@/lib/utils/utils'
import { DadosDoProcessoType, PecaType } from '@/lib/proc/process-types'
import { DocumentMatch, matchDocuments, SimilarityType } from '@/lib/utils/documentMatcher'
import Print from '@/components/slots/print'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRefresh } from '@fortawesome/free-solid-svg-icons'
import { selecionarPecasPorPadraoComFase, TipoDeSinteseMap } from '@/lib/proc/combinacoes'
import DiffViewer from './diff-viewer'
import { useRouter } from 'next/navigation'
import Chat from '@/components/slots/chat'
import { calcSha256 } from '@/lib/utils/hash'
import ProcessTextarea from '@/components/ProcessTextarea'

type DadosDoProcessoAndControlType =
    DadosDoProcessoType & { missingDadosDoProcesso: boolean, missingPeticaoInicial: boolean }

const formatSimilarity = (value: number) => {
    if (isNaN(value)) return ''
    if (value === -1) return ''
    const formated = `${(value * 100).toFixed(1)}`
    // console.log('value', value, 'formated', formated)
    if (formated === '100.0' && value < 1) return '99.9'
    return formated
}

const fixOutrosNumerosDeProcessos = (outrosNumerosDeProcessos: string, numeroDoProcesso: string): string => {
    const outrosNumerosDeProcessosArray = outrosNumerosDeProcessos.trim().split(',').map(n => n.trim())
    const outrosNumerosDeProcessosValidos = outrosNumerosDeProcessosArray.filter(n => n.length === 20)
    const numerosUnicosDeProcessos = new Set(outrosNumerosDeProcessosValidos);
    if (numerosUnicosDeProcessos.has(numeroDoProcesso)) numerosUnicosDeProcessos.delete(numeroDoProcesso)
    return Array.from(numerosUnicosDeProcessos).join(', ')
}

export default function AbusiveLitigationPage(params: { NAVIGATE_TO_PROCESS_URL?: string, hasApiKey: boolean }) {
    const NAVIGATE_TO_PROCESS_URL = params.NAVIGATE_TO_PROCESS_URL
    const hasApiKey = params.hasApiKey
    const [outrosNumerosDeProcessos, setOutrosNumerosDeProcessos] = useState('')
    const [numeroDoProcesso, setNumeroDoProcesso] = useState('')
    const [hidden, setHidden] = useState(true)
    const [promptConfig, setPromptConfig] = useState({} as PromptConfigType)
    const [peticaoInicial, setPeticaoInicial] = useState('')
    const [processos, setProcessos] = useState([] as DadosDoProcessoAndControlType[])
    const [similaridade, setSimilaridade] = useState({} as { [key: string]: DocumentMatch[] })
    const [processosMap, setProcessosMap] = useState({} as { [key: string]: DadosDoProcessoAndControlType })
    const [status, setStatus] = useState('')
    const [toast, setToast] = useState('')
    const [tipoDeSimilaridade, setTipoDeSimilaridade] = useState(SimilarityType.DICE)
    const [processoPrincipal, setProcessoPrincipal] = useState(undefined as DadosDoProcessoAndControlType)
    const [textos, setTextos] = useState([] as TextoType[])
    const [showDiff, setShowDiff] = useState(false)
    const [diffFrom, setDiffFrom] = useState('')
    const [diffTo, setDiffTo] = useState('')

    const router = useRouter()

    const handleCloseDiff = () => {
        setShowDiff(false)
        setDiffFrom('')
        setDiffTo('')
    }

    const handleShowDiff = (processo: DadosDoProcessoAndControlType, pecaIdx: number) => {
        setDiffFrom(principal.pecasSelecionadas[pecaIdx].conteudo || '')
        const s = similaridade[processo.numeroDoProcesso][pecaIdx]
        setDiffTo(s?.closestDocument.conteudo || '')
        setShowDiff(true);
    }

    const outrosNumerosDeProcessosChanged = (text) => {
        setOutrosNumerosDeProcessos(text)
        setHidden(true)
    }

    const numeroDoProcessoChanged = (text) => {
        setNumeroDoProcesso(text)
        setHidden(true)
    }

    const tipoDeSimilaridadeChanged = (text: SimilarityType) => {
        setTipoDeSimilaridade(text)
        setHidden(true)
    }

    // paste handling is now encapsulated by ProcessTextarea

    const localizarAPeticaoInicial = (dadosDoProcesso: DadosDoProcessoType): PecaType => {
        return dadosDoProcesso.pecasSelecionadas?.find(p => slugify(p.descr) === 'peticao-inicial')
    }

    const obterDadosDoProcessoEConteudoDaPeticaoInicial = async (numeroDoProcesso: string, procs: DadosDoProcessoAndControlType[], procsMap: { [key: string]: DadosDoProcessoAndControlType }): Promise<DadosDoProcessoAndControlType> => {
        let dadosDoProcesso: DadosDoProcessoAndControlType = procsMap[numeroDoProcesso]
        if (!dadosDoProcesso) {
            const response = await fetcher.get(`/api/v1/process/${numeroDoProcesso}`)
            if (response.arrayDeDadosDoProcesso && response.arrayDeDadosDoProcesso.length > 0) {
                for (const dadosDoProc of response.arrayDeDadosDoProcesso) {
                    const selecao = selecionarPecasPorPadraoComFase(dadosDoProc.pecas, TipoDeSinteseMap['LITIGANCIA_PREDATORIA'].padroes)
                    const pecasSelecionadas = selecao.pecas
                    const peticaoInicialPeca = pecasSelecionadas.find(peca => slugify(peca.descr) === 'peticao-inicial')
                    if (!peticaoInicialPeca)
                        continue
                    // dadosDoProcesso = response
                    dadosDoProcesso = {
                        ...dadosDoProc,
                        pecasSelecionadas,
                        missingDadosDoProcesso: false,
                        missingPeticaoInicial: false,
                        numeroDoProcesso,
                        ajuizamento: dadosDoProc.ajuizamento && new Date(dadosDoProc.ajuizamento)
                    }
                    break
                }
                for (const peca of dadosDoProcesso.pecasSelecionadas) {
                    if (peca.conteudo) continue
                    try {
                        const resp = await fetcher.get(`/api/v1/process/${numeroDoProcesso}/piece/${peca.id}/content`)
                        if (resp.errormsg) {
                            peca.errorMsg = resp.errormsg
                            peca.conteudo = ''
                        } else
                            peca.conteudo = resp.content
                    } catch (error) {
                        peca.errorMsg = `Erro ao carregar conteúdo da peça ${peca.id} - ${error}`
                    }
                }
                procsMap[numeroDoProcesso] = dadosDoProcesso
                setProcessosMap({ ...procsMap })
            }
            if (response.errorMsg) {
                dadosDoProcesso = { numeroDoProcesso, pecas: [], pecasSelecionadas: [], poloAtivo: '', poloPassivo: '', missingDadosDoProcesso: true, missingPeticaoInicial: true, errorMsg: response.errorMsg }
                procsMap[numeroDoProcesso] = dadosDoProcesso
                setProcessosMap({ ...procsMap })
            }
        }

        if (!dadosDoProcesso) {
            procsMap[numeroDoProcesso] = { numeroDoProcesso, pecas: [], pecasSelecionadas: [], poloAtivo: '', poloPassivo: '', missingDadosDoProcesso: true, missingPeticaoInicial: true }
            setProcessosMap({ ...procsMap })
            return procsMap[numeroDoProcesso]
        }

        const peticaoInicialPeca = localizarAPeticaoInicial(dadosDoProcesso)
        const peticaoInicialId = peticaoInicialPeca?.id
        if (!peticaoInicialPeca?.conteudo) {
            dadosDoProcesso.missingPeticaoInicial = true
            if (!dadosDoProcesso.errorMsg) dadosDoProcesso.errorMsg = 'Petição inicial não encontrada.'
        }
        // if (dadosDoProcesso.missingPeticaoInicial !== true) {
        //     if (peticaoInicialPeca && !peticaoInicialPeca.conteudo && peticaoInicialId) {
        //         const peticaoInicialConteudo = await fetcher.get(`/api/v1/process/${numeroDoProcesso}/piece/${peticaoInicialId}/content`)
        //         peticaoInicialPeca.conteudo = peticaoInicialConteudo.content
        //     }
        // }
        setProcessosMap({ ...procsMap })
        return dadosDoProcesso
    }

    const replaceMainProcess = async (numeroDoProcessoPrincipal: string) => {
        if (status) {
            setToast('Aguarde a conclusão antes de realizar a troca de processo principal')
            return
        }
        const n = numeroDoProcesso
        const o = outrosNumerosDeProcessos
        setHidden(true)
        setProcessos([])
        setSimilaridade({})
        setNumeroDoProcesso(numeroDoProcessoPrincipal)
        setOutrosNumerosDeProcessos(fixOutrosNumerosDeProcessos(o + ', ' + n, numeroDoProcessoPrincipal))
    }

    const resetCache = async () => {
        setHidden(true)
        setProcessosMap({})
        setProcessos([])
        setSimilaridade({})
    }

    const refreshProcesso = async (numeroDoProcesso: string) => {
        const procs = [...processos]
        const procsMap = { ...processosMap }
        const simMap = { ...similaridade }
        const index = procs.findIndex(p => p.numeroDoProcesso === numeroDoProcesso)
        if (index >= 0) {
            procs.splice(index, 1)
            delete procsMap[numeroDoProcesso]
            delete simMap[numeroDoProcesso]
            setProcessos([...procs])
            setProcessosMap({ ...procsMap })
            setSimilaridade({ ...simMap })
        }
        await carregarProcesso(processoPrincipal, numeroDoProcesso, procs, procsMap, simMap)
    }

    const carregarProcesso = async (dadosDoProcesso: DadosDoProcessoAndControlType, numeroDoOutroProcesso: string, procs: DadosDoProcessoAndControlType[], procsMap: { [key: string]: DadosDoProcessoAndControlType }, simMap: { [key: string]: DocumentMatch[] }) => {
        const dadosDoOutroProcesso = await obterDadosDoProcessoEConteudoDaPeticaoInicial(numeroDoOutroProcesso, procs, procsMap)
        if (!dadosDoOutroProcesso) {
            setStatus(`Processo ${numeroDoOutroProcesso} não encontrado.`)
            procs = [...procs, dadosDoOutroProcesso]
            setProcessos([...procs])
            return
        }
        simMap[numeroDoOutroProcesso] = matchDocuments(dadosDoProcesso.pecasSelecionadas, dadosDoOutroProcesso.pecasSelecionadas, tipoDeSimilaridade)
        setSimilaridade({ ...simMap })
        procs.push(dadosDoOutroProcesso)
        procs.sort((a, b) => {
            const sa = simMap[a.numeroDoProcesso]
            const sb = simMap[b.numeroDoProcesso]
            if (sa === undefined && sb === undefined) return 0
            if (sa === undefined) return 1
            if (sb === undefined) return -1
            return sb[0].similarity - sa[0].similarity
        })
        setProcessos([...procs])
    }

    const startAnalysis = async () => {
        try {
            let procs: DadosDoProcessoAndControlType[] = []
            let procsMap: { [key: string]: DadosDoProcessoAndControlType } = processosMap
            const simMap: { [key: string]: DocumentMatch[] } = {}

            setProcessoPrincipal(undefined)
            setProcessos(procs)
            setSimilaridade({})
            setHidden(false)

            // Obter a petição inicial do processo principal
            setStatus('Obtendo dados do processo principal...')
            const dadosDoProcesso = await obterDadosDoProcessoEConteudoDaPeticaoInicial(numeroDoProcesso, procs, procsMap)
            if (!dadosDoProcesso) {
                setStatus('Processo principal não encontrado.')
                return
            }
            procs.push(dadosDoProcesso)
            setProcessos([...procs])

            const peticaoInicial = localizarAPeticaoInicial(dadosDoProcesso)
            if (!peticaoInicial) {
                setStatus('Petição inicial não encontrada.')
                return
            }

            simMap[dadosDoProcesso.numeroDoProcesso] = matchDocuments(dadosDoProcesso.pecasSelecionadas, dadosDoProcesso.pecasSelecionadas, tipoDeSimilaridade)
            setSimilaridade({ ...simMap })


            // Obter a petição inicial dos outros processos
            const numerosUnicosDeProcessos = fixOutrosNumerosDeProcessos(outrosNumerosDeProcessos, numeroDoProcesso).split(',').map(n => n.trim())
            for (const numeroDoOutroProcesso of numerosUnicosDeProcessos) {
                if (!numeroDoOutroProcesso) continue
                // console.log('numeroDoOutroProcesso', numeroDoOutroProcesso)
                setStatus(`Obtendo dados do processo ${numeroDoOutroProcesso} (${procs.length + 1}/${numerosUnicosDeProcessos.length})...`)
                await carregarProcesso(dadosDoProcesso, numeroDoOutroProcesso, procs, procsMap, simMap)
            }

            setProcessoPrincipal(dadosDoProcesso)
            setTextos(await getPiecesWithContent(dadosDoProcesso, numeroDoProcesso, true))

            setStatus('')

        } catch (error) {
            if (error?.message === 'NEXT_REDIRECT') {
                // Extract the redirect path if it's included in the error
                const redirectPath = error.redirectPath || '/auth/signin';
                router.push(redirectPath);
                return; // Stop execution
            }
            console.error(`Erro: ${error.stack}`)
            setStatus(`${error.message}`)
        }
    }

    const principal: DadosDoProcessoAndControlType = processosMap[numeroDoProcesso]

    return (
        <div id="printDiv" className="mb-3">
            <h2 className="mt-3">Avaliação de Litigância Abusiva</h2>
            <div className="h-print">
                <PromptConfig kind="litigancia-predatoria" setPromptConfig={setPromptConfig} />
                <div className="row mb-3 mt-3">
                    <div className="col col-6">
                        <div className="form-group">
                            <label>Número do Principal Processo Suspeito</label>
                            <input type="text" id="key" name="key" placeholder="" autoFocus={true} className="form-control" onChange={(e: React.ChangeEvent<HTMLInputElement>) => numeroDoProcessoChanged(e.target.value.replace(/\D/g, ""))} value={numeroDoProcesso} autoComplete='' />
                        </div>
                    </div>
                    <div className="col col-6 d-none">
                        <div className="form-group">
                            <label>Tipo de Similaridade</label>
                            <select className="form-control" value={tipoDeSimilaridade} onChange={(e) => tipoDeSimilaridadeChanged(e.target.value as SimilarityType)}>
                                {Object.keys(SimilarityType).map((key) => (
                                    <option key={key} value={SimilarityType[key]}>{SimilarityType[key]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="form-group"><label>Outros Números de Processos Suspeitos</label></div>
                <div className="alert alert-secondary mb-1 p-0">
                    <ProcessTextarea
                        className="form-control"
                        value={outrosNumerosDeProcessos}
                        onChange={(val) => outrosNumerosDeProcessosChanged(val)}
                    />
                </div>
                {hidden && <>
                    <div className="text-body-tertiary">Informe o número do processo suspeito, a lista de outros processos a serem analisados e clique em &quot;Analisar&quot;.</div>
                </>}
                {hidden && <>
                    <Button disabled={!numeroDoProcesso.trim()} className="mt-3" onClick={() => startAnalysis()}>Analisar</Button>
                    <Button disabled={!numeroDoProcesso.trim()} className="mt-3 ms-3" variant='secondary' onClick={() => resetCache()}>Limpar o Cache</Button>
                </>}
                {status && <div className="mt-3 alert alert-warning">{status}</div>}
            </div>
            {!hidden && processos && processos.length > 0 && <>
                <h2 className="mt-3">Processos Analisados</h2>
                <table className="table table-striped table-sm">
                    <thead className="table-dark">
                        <tr>
                            <th className="text-end">#</th>
                            <th>Número do Processo</th>
                            <th className="text-center">Ajuizamento</th>
                            <th className="text-center">OAB</th>
                            {principal.pecasSelecionadas?.map(p => <th key={p.rotulo} className="text-end">{p.rotulo.toLowerCase()}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {processos.map((processo, index) => (
                            <tr key={index}>
                                <td className="text-end" title="Clique para tornar o principal" style={{ cursor: 'pointer' }} onClick={e => replaceMainProcess(processo.numeroDoProcesso)}>{index + 1}</td>
                                <td>{NAVIGATE_TO_PROCESS_URL ? (<a href={NAVIGATE_TO_PROCESS_URL.replace('{numero}', processo.numeroDoProcesso)} style={{ color: 'rgb(33, 37, 41)', textDecoration: 'none' }} target="_blank" title="Clique para visualizar o processo">{processo.numeroDoProcesso}</a>) : processo.numeroDoProcesso}</td>
                                {processo.errorMsg
                                    ? <td className="text-end text-danger" colSpan={principal.pecasSelecionadas.length + 2}>{processo.errorMsg &&
                                        <>
                                            {processo.errorMsg}
                                            <span className="text-secondary" onClick={() => { refreshProcesso(processo.numeroDoProcesso) }}> <FontAwesomeIcon icon={faRefresh} /></span>
                                        </>
                                    }</td>
                                    : <>
                                        <td className="text-center">{formatBrazilianDate(processo.ajuizamento)}</td>
                                        <td className="text-center">{processo.oabPoloAtivo}</td>
                                        {principal.pecasSelecionadas?.map((p, index) => {
                                            const s = similaridade[processo.numeroDoProcesso][index]
                                            return <td title={s.closestDocument?.errorMsg} key={`${processo}-${p.rotulo}`} className={`text-end${s.closestDocument?.errorMsg ? ' text-danger' : ''}`}><span onClick={() => handleShowDiff(processo, index)}>{formatSimilarity(s.similarity)}</span></td>
                                        })}
                                    </>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </>}

            {!hidden && processoPrincipal && textos && hasApiKey && <>
                <h2 className="mt-3">Análise Qualitativa</h2>
                <AiContent key={numeroDoProcesso + outrosNumerosDeProcessos}
                    definition={getInternalPrompt('litigancia-predatoria')}
                    data={{ textos }}
                    options={{ cacheControl: true }} config={promptConfig} dossierCode={undefined} />

                <Chat definition={getInternalPrompt('chat')} data={{ textos }} key={calcSha256({ textos })} />
            </>}
            <Toast onClose={() => setToast('')} show={!!toast} delay={3000} bg="danger" autohide key={toast} style={{ position: 'fixed', top: 10, right: 10 }}>
                <Toast.Header>
                    <strong className="me-auto">Erro</strong>
                </Toast.Header>
                <Toast.Body>{toast}</Toast.Body>
            </Toast>
            <Print numeroDoProcesso={numeroDoProcesso} />
            <DiffViewer show={showDiff} onClose={handleCloseDiff} from={diffFrom} to={diffTo} />
        </div>
    )
}