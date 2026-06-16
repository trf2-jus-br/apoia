import { Form, FormGroup, FormLabel, FormSelect, Row, Spinner, Container } from "react-bootstrap"
import { enumSorted } from "@/lib/ai/model-types"
import { Instance, InstanceKeyType, Matter, Scope } from "@/lib/proc/process-types"
import { usePromptContext } from "../context/PromptContext"
import { FaseProcessual } from "@/lib/proc/combinacoes"

const Fase = ({ fase }: { fase: string | undefined }) => {
    if (!fase) return null
    const faseInfo = Object.values(FaseProcessual).find(f => f.name === fase)
    const faseDescricao = faseInfo?.descr || fase
    return <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({faseDescricao?.toLocaleLowerCase()})</span>
}

export function ProcessFilters() {
    const {
        number,
        setNumber,
        numeroDoProcesso,
        dadosDoProcesso,
        arrayDeDadosDoProcesso,
        idxProcesso,
        setIdxProcesso,
        setDadosDoProcesso,
        scope,
        setScope,
        instance,
        setInstance,
        matter,
        setMatter,
        faseAtual,
    } = usePromptContext()
    return (
        <div className="bg-primary text-white">
            <Container className="p-2 pb-3" fluid={false}>
                <FormGroup as={Row} className="">
                    <div className="col col-auto">
                        <FormLabel className="mb-0">Número do Processo</FormLabel>
                        <Form.Control 
                            name="numeroDoProcesso" 
                            placeholder="(opcional)" 
                            autoFocus={true} 
                            className="form-control" 
                            onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} 
                            value={number} 
                        />
                    </div>
                    {numeroDoProcesso && !dadosDoProcesso && (
                        <div className="col col-auto">
                            <FormLabel className="mb-0">&nbsp;</FormLabel>
                            <span className="form-control text-white" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                <Spinner size="sm" animation="border" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </Spinner>
                            </span>
                        </div>
                    )}
                    {numeroDoProcesso && arrayDeDadosDoProcesso && arrayDeDadosDoProcesso.length > 1 && (
                        <div className="col col-auto">
                            <FormLabel className="mb-0">Tramitação <Fase fase={faseAtual} /></FormLabel>
                            <FormSelect 
                                value={idxProcesso} 
                                onChange={(e) => { 
                                    const idx = parseInt(e.target.value)
                                    setIdxProcesso(idx)
                                    setDadosDoProcesso(arrayDeDadosDoProcesso[idx]) 
                                }} 
                                className="form-select"
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
                        <FormLabel className="mb-0">Segmento</FormLabel>
                        <FormSelect 
                            value={scope} 
                            onChange={(e) => setScope(e.target.value)} 
                            className={`form-select w-auto${scope ? ' bg-warning' : ''}`}
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
                        <FormLabel className="mb-0">Instância</FormLabel>
                        <FormSelect 
                            value={instance} 
                            onChange={(e) => setInstance(e.target.value as InstanceKeyType | undefined)} 
                            className={`form-select w-auto${instance ? ' bg-warning' : ''}`}
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
                        <FormLabel className="mb-0">Natureza</FormLabel>
                        <FormSelect 
                            value={matter} 
                            onChange={(e) => setMatter(e.target.value)} 
                            className={`form-select w-auto${matter ? ' bg-warning' : ''}`}
                        >
                            <option value="">Todas</option>
                            {enumSorted(Matter).map((s) => (
                                <option key={`key-matter-${s.value.name}`} value={s.value.name}>
                                    {s.value.descr}
                                </option>
                            ))}
                        </FormSelect>
                    </div>
                </FormGroup>
            </Container>
        </div>
    )
}
