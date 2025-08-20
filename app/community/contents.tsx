'use client'

import { IAPromptList } from "@/lib/db/mysql-types"
import { UserType } from "@/lib/user"
import PromptsTable from "./prompts-table"
import { useSearchParams } from "next/navigation"
import React, { useEffect, useState } from "react"
import ProcessNumberForm from "./process-number-form"
import TargetText from "./target-text"
import { DadosDoProcessoType, Instance, Matter, Scope } from "@/lib/proc/process-types"
import ProcessContents from "./process-contents"
import ProcessTitle from "../../components/slots/process-title"
import { SubtituloLoading } from "../../components/slots/subtitulo"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEdit } from "@fortawesome/free-solid-svg-icons"
import { Button, Dropdown, DropdownButton, Form, FormGroup, FormLabel, FormSelect, Row, Toast, ToastContainer, Tab, Tabs } from "react-bootstrap"
import { enumSorted } from "@/lib/ai/model-types"
import { Container, Spinner } from 'react-bootstrap'
import { tua } from "@/lib/proc/tua"
import Link from "next/link"
import { VisualizationEnum } from "@/lib/ui/preprocess"
import { array } from "zod"

export const copyPromptToClipboard = (prompt: IAPromptList) => {
    let s: string = prompt.content.system_prompt
    s = s ? `# PROMPT DE SISTEMA\n\n${s}\n\n# PROMPT\n\n` : ''
    s += prompt.content.prompt
    navigator.clipboard.writeText(s)
}

export function Contents({ prompts, user, user_id, apiKeyProvided, model }: { prompts: IAPromptList[], user: UserType, user_id: number, apiKeyProvided: boolean, model?: string }) {
    const currentSearchParams = useSearchParams()
    const [prompt, setPrompt] = useState<IAPromptList>(null)
    const [numeroDoProcesso, setNumeroDoProcesso] = useState<string>(null)
    const [arrayDeDadosDoProcesso, setArrayDeDadosDoProcesso] = useState<DadosDoProcessoType[]>(null)
    const [idxProcesso, setIdxProcesso] = useState(0)
    const [dadosDoProcesso, setDadosDoProcesso] = useState<DadosDoProcessoType>(null)
    const [promptParam, setPromptParam] = useState<string>(currentSearchParams.get('prompt'))
    const processParam = currentSearchParams.get('process')
    const [number, setNumber] = useState<string>('')
    const [scope, setScope] = useState<string>()
    const [instance, setInstance] = useState<string>()
    const [matter, setMatter] = useState<string>()
    const [pieceContent, setPieceContent] = useState({})
    const [toast, setToast] = useState<string>()
    const [toastVariant, setToastVariant] = useState<string>()
    const [activeTab, setActiveTab] = useState<string>('principal')

    const toastMessage = (message: string, variant: string) => {
        setToast(message)
        setToastVariant(variant)
    }


    // const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //     setFilter(e.target.value)
    // }

    useEffect(() => {
        if (number?.length == 20)
            setNumeroDoProcesso(number)
        else
            setNumeroDoProcesso(null)
    }, [number])

    const promptOnClick = (kind: string, row: any) => {
        switch (kind) {
            case 'executar':
                if (row.content.target === 'PROCESSO' && !numeroDoProcesso) {
                    toastMessage('Antes de executar esse prompt é necessário informar o número do processo', 'warning')
                    // Focus on the process number input field
                    document.querySelector<HTMLInputElement>('input[name="numeroDoProcesso"]')?.focus()
                    return
                }
                setPrompt(row)
                break;
            case 'copiar':
                copyPromptToClipboard(row)
                toastMessage('Prompt copiado para a área de transferência', 'success')
                break
            case 'copiar link para favoritar':
                navigator.clipboard.writeText(`Clique no link abaixo para adicionar o prompt ${row.name} aos favoritos:\n\n${window.location.origin}/community/prompt/${row.base_id}/set-favorite`)
                toastMessage('Link copiado para a área de transferência', 'success')
                break
        }
    }

    const loadProcess = async (numeroDoProcesso: string) => {
        const response = await fetch(`/api/v1/process/${numeroDoProcesso}`)
        if (response.ok) {
            const data = await response.json()
            if (data.errorMsg) {
                toastMessage(data.errorMsg, 'danger')
                setArrayDeDadosDoProcesso(null)
                setDadosDoProcesso(null)
                setNumeroDoProcesso(null)
                return
            }
            setArrayDeDadosDoProcesso(data.arrayDeDadosDoProcesso)
            const dadosDoProc = data.arrayDeDadosDoProcesso[0]
            setIdxProcesso(0)
            setDadosDoProcesso(dadosDoProc)
        }
    }

    if (promptParam && (!prompt || prompt.base_id !== parseInt(promptParam))) {
        setPrompt(prompts.find(p => p.base_id === parseInt(promptParam)))
    }

    if (processParam && (!numeroDoProcesso || numeroDoProcesso !== processParam)) {
        setNumeroDoProcesso(processParam)
    }

    useEffect(() => {
        if (numeroDoProcesso) {
            loadProcess(numeroDoProcesso)
        } else {
            setDadosDoProcesso(null)
        }
        // loadProcess is stable; suppress exhaustive-deps for number change only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numeroDoProcesso])

    useEffect(() => {
        if (!dadosDoProcesso) {
            setScope(undefined)
            setInstance(undefined)
            setMatter(undefined)
            return
        }
        if (dadosDoProcesso.segmento && Scope[dadosDoProcesso.segmento]) setScope(dadosDoProcesso.segmento)
        else setScope(undefined)
        if (dadosDoProcesso.instancia && Instance[dadosDoProcesso.instancia]) setInstance(dadosDoProcesso.instancia)
        else setInstance(undefined)
        if (dadosDoProcesso.materia && Matter[dadosDoProcesso.materia]) setMatter(dadosDoProcesso.materia)
        else setMatter(undefined)
    }, [dadosDoProcesso])



    const PromptTitle = ({ prompt }: { prompt: IAPromptList }) => <div className="text-body-tertiary text-center h-print">Prompt: {prompt.name} - <span onClick={() => { setPromptParam(undefined); setPrompt(null) }} className="text-primary" style={{ cursor: 'pointer' }}><FontAwesomeIcon icon={faEdit} /> Alterar</span></div>

    const filteredPromptsBase = prompts.filter((p) => {
        if (scope && !p.content.scope?.includes(scope)) return false
        if (instance && !p.content.instance?.includes(instance)) return false
        if (matter && !p.content.matter?.includes(matter)) return false
        return true
    })

    const promptsPrincipais = filteredPromptsBase.filter((p) => {
        return p.share === 'PADRAO' || p.is_mine
    })

    const promptsComunidade = filteredPromptsBase.filter((p) => {
        return p.share !== 'PADRAO' && !p.is_mine
    })

    return !prompt
        ? <>
            {/* <div className="" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}> */}
            <div className="bg-primary text-white">
                <Container className="p-2 pb-3" fluid={false}>
                    <FormGroup as={Row} className="">
                        <div className="col col-auto">
                            <FormLabel className="mb-0">Número do Processo</FormLabel>
                            <Form.Control name="numeroDoProcesso" placeholder="(opcional)" autoFocus={true} className="form-control" onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} value={number} />
                        </div>
                        {numeroDoProcesso && !dadosDoProcesso &&
                            <div className="col col-auto">
                                <FormLabel className="mb-0">&nbsp;</FormLabel>
                                <span className="form-control text-white" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}><Spinner size="sm" animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner></span>
                            </div>
                        }
                        {numeroDoProcesso && arrayDeDadosDoProcesso && arrayDeDadosDoProcesso.length > 1 &&
                            <div className="col col-auto">
                                <FormLabel className="mb-0">Tramitação</FormLabel>
                                <FormSelect value={idxProcesso} onChange={(e) => { const idx = parseInt(e.target.value); setIdxProcesso(idx); setDadosDoProcesso(arrayDeDadosDoProcesso[idx]) }} className="form-select">
                                    {arrayDeDadosDoProcesso.map((d, idx) => <option key={idx} value={idx}>{d.classe}</option>)}
                                </FormSelect>
                            </div>
                        }
                        {dadosDoProcesso && arrayDeDadosDoProcesso && arrayDeDadosDoProcesso.length === 1 &&
                            <div className="col col-auto">
                                <FormLabel className="mb-0">&nbsp;</FormLabel>
                                <span className="form-control text-white" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>{dadosDoProcesso.classe}</span>
                            </div>
                        }
                        <div className="col col-auto ms-auto">
                            <FormLabel className="mb-0">Segmento</FormLabel>
                            <FormSelect value={scope} onChange={(e) => setScope(e.target.value)} className={`form-select w-auto${scope ? ' bg-warning' : ''}`}>
                                <option value="">Todos</option>
                                {enumSorted(Scope).map((s) => <option key={`key-scope-${s.value.name}`} value={s.value.name}>{s.value.descr}</option>)}
                            </FormSelect>
                        </div>
                        <div className="col col-auto">
                            <FormLabel className="mb-0">Instância</FormLabel>
                            <FormSelect value={instance} onChange={(e) => setInstance(e.target.value)} className={`form-select w-auto${instance ? ' bg-warning' : ''}`}>
                                <option value="">Todas</option>
                                {enumSorted(Instance).map((s) => <option key={`key-instance-${s.value.name}`} value={s.value.name}>{s.value.descr}</option>)}
                            </FormSelect>
                        </div>
                        <div className="col col-auto">
                            <FormLabel className="mb-0">Natureza</FormLabel>
                            <FormSelect value={matter} onChange={(e) => setMatter(e.target.value)} className={`form-select w-auto${matter ? ' bg-warning' : ''}`}>
                                <option value="">Todas</option>
                                {enumSorted(Matter).map((s) => <option key={`key-matter-${s.value.name}`} value={s.value.name}>{s.value.descr}</option>)}
                            </FormSelect>
                        </div>
                    </FormGroup >
                </Container>
            </div >
            <Container className="mt-2 mb-3" fluid={false}>
                {!apiKeyProvided && <p className="text-center mt-3 mb-3">Execute os prompts diretamente na Apoia, cadastrando sua <Link href="/prefs">Chave de API</Link>.</p>}
                
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k || 'principal')}
                    className="mt-3"
                >
                    <Tab eventKey="principal" title="Principais">
                        <PromptsTable prompts={promptsPrincipais} onClick={promptOnClick} onProcessNumberChange={setNumeroDoProcesso}>
                            <div className="col col-auto">
                                <DropdownButton id="criar-novo-dropdown" title="Criar Novo" variant="primary">
                                    <Dropdown.Item href="/community/prompt/new">Prompt</Dropdown.Item>
                                    <Dropdown.Item href="/community/prompt/new?template=true">Prompt a partir de um modelo</Dropdown.Item>
                                </DropdownButton>
                            </div>
                        </PromptsTable>
                    </Tab>
                    
                    <Tab eventKey="comunidade" title="Prompts Não Avaliados">
                        <PromptsTable prompts={promptsComunidade} onClick={promptOnClick} onProcessNumberChange={setNumeroDoProcesso}>
                            <div className="col col-auto">
                                <DropdownButton id="criar-novo-dropdown" title="Criar Novo" variant="primary">
                                    <Dropdown.Item href="/community/prompt/new">Prompt</Dropdown.Item>
                                    <Dropdown.Item href="/community/prompt/new?template=true">Prompt a partir de um modelo</Dropdown.Item>
                                </DropdownButton>
                            </div>
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
            <ToastContainer className="p-3" position="bottom-end" style={{ zIndex: 1 }}>
                <Toast onClose={() => setToast('')} show={!!toast} delay={10000} bg={toastVariant} autohide key={toast} >
                    <Toast.Header>
                        <strong className="me-auto">Atenção</strong>
                    </Toast.Header>
                    <Toast.Body>{toast}</Toast.Body>
                </Toast>
            </ToastContainer>

        </>
        : <>
            <Container className="mt-4" fluid={false}>
                {(prompt.content.target !== 'PROCESSO' || !numeroDoProcesso) && <PromptTitle prompt={prompt} />}
                {prompt.content.target === 'PROCESSO'
                    ? !numeroDoProcesso
                        ? <ProcessNumberForm id={`${prompt.base_id}`} onChange={setNumeroDoProcesso} />
                        : <>
                            <div id="printDiv">
                                {dadosDoProcesso
                                    ? <><ProcessTitle id={dadosDoProcesso?.numeroDoProcesso} />
                                        <ProcessContents prompt={prompt} dadosDoProcesso={dadosDoProcesso} pieceContent={pieceContent} setPieceContent={setPieceContent} apiKeyProvided={apiKeyProvided} model={model}>
                                            <PromptTitle prompt={prompt} />
                                        </ProcessContents>
                                    </>
                                    : <><ProcessTitle id={numeroDoProcesso} /><SubtituloLoading /><PromptTitle prompt={prompt} /></>}
                            </div>
                        </>
                    :
                    prompt.content.target === 'TEXTO'
                        ? <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} />
                        : prompt.content.target === 'REFINAMENTO'
                            ? <TargetText prompt={prompt} apiKeyProvided={apiKeyProvided} visualization={VisualizationEnum.DIFF} />
                            : null
                }
            </Container></>
}