import { Form, FormGroup, FormLabel, FormSelect, Row, Spinner, Container, FormText } from "react-bootstrap"
import { enumSorted } from "@/lib/ai/model-types"
import { Instance, InstanceKeyType, Matter, Scope } from "@/lib/proc/process-types"
import { usePromptContext } from "../context/PromptContext"
import { FaseProcessual } from "@/lib/proc/combinacoes"
import { IAPromptList } from "@/lib/db/mysql-types"
import { modeFromPathname } from "@/lib/utils/mode-url"
import { usePathname } from 'next/navigation'

const Fase = ({ fase }: { fase: string | undefined }) => {
    if (!fase) return null
    const faseInfo = Object.values(FaseProcessual).find(f => f.name === fase)
    const faseDescricao = faseInfo?.descr || fase
    return <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({faseDescricao?.toLocaleLowerCase()})</span>
}

export function ProcessFilters({ singleExecutablePrompt, onExecute }: { singleExecutablePrompt?: IAPromptList | null, onExecute?: (row: IAPromptList) => void }) {
    const {
        number,
        setNumber,
        numeroDoProcesso,
        dadosDoProcesso,
        arrayDeDadosDoProcesso,
        idxProcesso,
        setIdxProcesso,
        filtro,
        setFiltro,
        setDadosDoProcesso,
        scope,
        setScope,
        instance,
        setInstance,
        matter,
        setMatter,
        faseAtual,
    } = usePromptContext()

    const mode = modeFromPathname(usePathname())

    return (
        <div className="bg-primary text-white">
            <Container className="p-2 pb-3" fluid={false}>
                <FormGroup as={Row} className="">
                    <div className="col col-auto">
                        <FormLabel className="mb-0" htmlFor="numeroDoProcesso"><u>N</u>úmero do Processo</FormLabel>
                        <Form.Control
                            id="numeroDoProcesso"
                            name="numeroDoProcesso"
                            placeholder="(opcional)"
                            autoFocus={true}
                            className="form-control"
                            onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                            value={number}
                            accessKey="n"
                        />
                    </div>
                    {numeroDoProcesso && !dadosDoProcesso && (
                        <div className="col col-auto">
                            <FormLabel className="mb-0">&nbsp;</FormLabel>
                            <span className="form-control text-white" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                <Spinner size="sm" animation="border" role="status">
                                    <span className="visually-hidden">Carregando...</span>
                                </Spinner>
                            </span>
                        </div>
                    )}
                    {numeroDoProcesso && arrayDeDadosDoProcesso && arrayDeDadosDoProcesso.length > 1 && (
                        <div className="col col-auto">
                            <FormLabel className="mb-0" htmlFor="tramitacao">T<u>r</u>amitação <Fase fase={faseAtual} /></FormLabel>
                            <FormSelect
                                id="tramitacao"
                                value={idxProcesso}
                                onChange={(e) => {
                                    const idx = parseInt(e.target.value)
                                    setIdxProcesso(idx)
                                    setDadosDoProcesso(arrayDeDadosDoProcesso[idx])
                                }}
                                className="form-select"
                                accessKey="r"
                            >
                                {arrayDeDadosDoProcesso.map((d, idx) => (
                                    <option key={idx} value={idx}>{d.classe}</option>
                                ))}
                            </FormSelect>
                        </div>
                    )}
                    {dadosDoProcesso && arrayDeDadosDoProcesso && arrayDeDadosDoProcesso.length === 1 && (
                        <div className="col col-auto">
                            <FormLabel className="mb-0">&nbsp;</FormLabel>
                            <span className="form-control text-white" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                {dadosDoProcesso.classe}
                            </span>
                        </div>
                    )}
                    <div className="col col-auto ms-auto">
                        <FormLabel className="mb-0" htmlFor="filtro"><u>F</u>iltro</FormLabel>
                        <Form.Control
                            id="filtro"
                            type="text"
                            value={filtro ?? ''}
                            onChange={(e) => setFiltro(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && singleExecutablePrompt && onExecute) {
                                    e.preventDefault()
                                    onExecute(singleExecutablePrompt)
                                }
                            }}
                            className={`${filtro ? ' bg-warning' : ''}`}
                            accessKey="f"
                            style={{ width: '6em' }}
                        />
                    </div>
                    {mode !== 'ADMINISTRATIVO' && <>
                        <div className="col col-auto">
                            <FormLabel className="mb-0" htmlFor="segmento">Segmento</FormLabel>
                            <FormSelect
                                id="segmento"
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                                className={`form-select ${scope ? ' bg-warning' : ''}`}
                                style={{ width: '6em' }}
                            >
                                <option value="">Todos</option>
                                {enumSorted(Scope).map((s) => (
                                    <option key={`key-scope-${s.value.name}`} value={s.value.name}>
                                        {s.value.descr}
                                    </option>
                                ))}
                            </FormSelect>
                        </div>
                        <div className="col col-auto">
                            <FormLabel className="mb-0" htmlFor="instancia">Instância</FormLabel>
                            <FormSelect
                                id="instancia"
                                value={instance}
                                onChange={(e) => setInstance(e.target.value as InstanceKeyType | undefined)}
                                className={`form-select ${instance ? ' bg-warning' : ''}`}
                                style={{ width: '6em' }}
                            >
                                <option value="">Todas</option>
                                {enumSorted(Instance).map((s) => (
                                    <option key={`key-instance-${s.value.name}`} value={s.value.name}>
                                        {s.value.descr}
                                    </option>
                                ))}
                            </FormSelect>
                        </div>
                        <div className="col col-auto">
                            <FormLabel className="mb-0" htmlFor="natureza">Natureza</FormLabel>
                            <FormSelect
                                id="natureza"
                                value={matter}
                                onChange={(e) => setMatter(e.target.value)}
                                className={`form-select ${matter ? ' bg-warning' : ''}`}
                                style={{ width: '6em' }}
                            >
                                <option value="">Todas</option>
                                {enumSorted(Matter).map((s) => (
                                    <option key={`key-matter-${s.value.name}`} value={s.value.name}>
                                        {s.value.descr}
                                    </option>
                                ))}
                            </FormSelect>
                        </div></>
                    }
                </FormGroup>
            </Container>
        </div>
    )
}
