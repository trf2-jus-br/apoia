'use client'

import { Button } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { loadRanking } from './ranking-actions'
import { EMPTY_FORM_STATE, FormHelper } from '@/lib/ui/form-support'
import { Suspense, useState } from 'react'
import _ from 'lodash'
import { IARankingType, IATestset } from '@/lib/db/mysql-types'
import { useEffect } from 'react'
import TableRecords from '@/components/table-records'
import Link from 'next/link'
import { intOrUndefined } from '@/lib/utils/utils'

const Frm = new FormHelper()

function RankingTable({ kind, testsetId, promptId, modelId }) {
    const [records, setRecords] = useState([] as IARankingType[])

    useEffect(() => {
        const asyncSetData = async () => {
            const ranking = await loadRanking(kind, intOrUndefined(testsetId), intOrUndefined(promptId), intOrUndefined(modelId))
            setRecords(ranking as IARankingType[])
        }
        asyncSetData()
    }, [testsetId, promptId, modelId, kind])

    if (testsetId && promptId && modelId && records.length === 0) return <div>
        <p>Não foi realizada uma avaliação para a Coleção de Testes, o Prompt e o Modelo de Liguagem selecionados acima. Clique no botão abaixo para iniciar.</p>
        <Link className="btn btn-primary" href={`test/${testsetId}/${promptId}/${modelId}`}>Avaliar</Link>
    </div>

    return (<TableRecords records={records} spec="Ranking" pageSize={20} linkToBack='..' />)
}

export default function Ranking(props) {
    const router = useRouter()
    let testset_id_inicial = props.testset_id
    // if (!testset_id_inicial || (props.testsets && props.testsets[0] && !props.testsets.map(i => i.id).includes(testset_id_inicial))) testset_id_inicial = props.testsets && props.testsets[0] ? props.testsets[0].id : null
    let prompt_id_inicial = props.prompt_id
    // if (!prompt_id_inicial || (props.prompts && props.prompts[0] && !props.prompts.map(i => i.id).includes(prompt_id_inicial))) prompt_id_inicial = props.prompts && props.prompts[0] ? props.prompts[0].id : null
    let model_id_inicial = props.model_id
    // if (!model_id_inicial || (props.models && props.models[0] && !props.models.map(i => i.id).includes(model_id_inicial))) model_id_inicial = props.models && props.models[0] ? props.models[0].id : null
    const [testset_id, setTestsetId] = useState(testset_id_inicial)
    const [prompt_id, setPromptId] = useState(prompt_id_inicial)
    const [model_id, setModelId] = useState(model_id_inicial)

    Frm.update({ testset_id, prompt_id, model_id }, (d) => { setTestsetId(d.testset_id); setPromptId(d.prompt_id); setModelId(d.model_id) }, EMPTY_FORM_STATE)

    return (<>
        <div className="row mb-5">
            <Frm.Select label="Coleção de Testes" name="testset_id" options={[{ id: 0, value: '' }, ...props.testsets]} width={4} />
            <Frm.Select label="Prompt" name="prompt_id" options={[{ id: 0, value: '' }, ...props.prompts]} width={4} />
            <Frm.Select label="Modelo de Linguagem" name="model_id" options={[{ id: 0, value: '' }, ...props.models]} width={4} />
            {/* <Frm.Button onClick={loadTests} variant="primary">Testar</Frm.Button> */}
        </div >
        <Suspense fallback={<div>Carregando...</div>}>
            <RankingTable kind={props.kind} testsetId={testset_id} promptId={prompt_id} modelId={model_id} />
        </Suspense>
    </>)
}