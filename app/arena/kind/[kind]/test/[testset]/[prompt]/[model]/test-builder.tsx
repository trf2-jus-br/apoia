'use client'

import { useEffect, useRef, useState } from 'react'
import { ResumoDePecaLoading } from '@/components/loading'
import { parse } from 'partial-json'
import { IAModel, IAPrompt, IATest, IATestset, IATestTestAttemptAnswer } from '@/lib/db/mysql-types'
import { ATTEMPTS, buildTest } from '@/lib/ai/test/test-config'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faX } from '@fortawesome/free-solid-svg-icons'
import { faComment } from '@fortawesome/free-regular-svg-icons'
import { OverlayTrigger, Popover } from 'react-bootstrap'
import { TestTable } from './test-table'

export const dynamic = 'force-dynamic'

const buildArray = (json: any, prefix: string, splitter: string): string[] => {
    const results: { index: number, result: string }[] = []
    for (const key in json) {
        if (key.startsWith(prefix + splitter)) {
            const idx = parseInt(key.split(splitter)[1])
            results.push({ index: idx, result: json[key] })
        }
    }
    results.sort((a, b) => a.index - b.index)
    return results.map(r => r.result)
}


export default function TestBuilder({ kind, testset, prompt, model }: { kind: string, testset: IATestset, prompt: IAPrompt, model: IAModel }) {
    const [current, setCurrent] = useState('')
    const [complete, setComplete] = useState(false)
    const [errormsg, setErrormsg] = useState('')
    const [show, setShow] = useState(false)
    const initialized = useRef(false)

    const fetchStream = async () => {
        const response = await fetch(`/api/test/${testset.id}/${prompt.id}/${model.id}`, {
            method: 'GET',
        })
        const reader = response.body?.getReader()

        if (reader) {
            const chunks: Uint8Array[] = []
            // const decoder = new TextDecoder('utf-8')
            while (true) {
                const { done, value } = await reader.read()
                if (done) {
                    setComplete(true)
                    break
                }
                chunks.push(value)
                try {
                    const text = Buffer.concat(chunks).toString("utf-8")
                    setCurrent(text)
                }
                catch (e) {
                    console.log(e.message)
                }
            }
        }
    }

    useEffect(() => {
        const run = async () => {
            setCurrent('')
            setErrormsg('')
            setComplete(false)
            try {
                fetchStream()
            } catch (e) {
                setErrormsg((e as Error).message)
            }
        }

        if (initialized.current) return
        initialized.current = true
        run()
        // fetchStream is stable in this component scope; suppress exhaustive-deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const json = parse(current || '{}')
    let maxProgress = 0
    for (const key in json) {
        if (key.startsWith('progress-') && maxProgress < parseInt(key.slice(9)))
            maxProgress = parseInt(key.slice(9))
    }
    const progress = json[`progress-${maxProgress}`]

    const promptResults = buildArray(json, 'prompt-result', '-')
    const questionsResults = buildArray(json, 'questions-result', '-').map(r => parse(r || '{}'))

    const jsonTest = buildTest(testset, prompt, model, promptResults, questionsResults)

    // const jsonTest: IATest = {
    //     id: 0,
    //     testset_id: testset.id,
    //     prompt_id: prompt.id,
    //     model_id: model.id,
    //     score: 0,
    //     content: {
    //         tests: testset.content.tests.map(test => ({
    //             name: test.name,
    //             questions: test.questions,
    //             attempts: []
    //         }))
    //     }
    // }

    // for (let i = 0; i < promptResults.length; i++) {
    //     const promptResult = promptResults[i]
    //     const test = i % testset.content.tests.length
    //     const attempt = Math.floor(i / testset.content.tests.length)
    //     let answers: IATestTestAttemptAnswer[] = []
    //     if (questionsResults.length > i && questionsResults[i].respostas) {
    //         answers = questionsResults[i].respostas.map((r) => ({
    //             snippet: r.trecho,
    //             result: r.resposta === 'sim',
    //             justification: r.justificativa
    //         }))
    //     }
    //     jsonTest.content.tests[test].attempts.push({ result: promptResult, answers })
    // }

    return <div className="row mb-3">
        <div className="col-12">
            {progress?.s !== '' && <>
                <h1>Status</h1>
                {errormsg && <div className={`alert alert-danger`}>{errormsg}</div>}
                {progress && <div className={`alert alert-warning`}>
                    <div dangerouslySetInnerHTML={{ __html: progress.s }} />
                    {progress.percent > 0 && <div className="progress"><div className="progress-bar" role="progressbar" style={{ width: `${progress.percent}%` }} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}></div></div>}
                </div>}
                {!errormsg && !progress && <ResumoDePecaLoading />}
            </>}
        </div>
        <div className="col-12">
            <TestTable testset={testset} test={jsonTest} promptFormat={prompt.content.format} />
        </div>
    </div>
}


