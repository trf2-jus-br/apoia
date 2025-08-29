'use client'

import { ATTEMPTS, score, scorePerAttempt, scorePerQuestion } from "@/lib/ai/test/test-config";
import { IATest, IATestset, IATestTest } from "@/lib/db/mysql-types";
import { faComment } from "@fortawesome/free-regular-svg-icons";
import { faBrain, faCheck, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { OverlayTrigger, Popover } from "react-bootstrap";
import { format } from "@/lib/ai/format";
import { preprocess, VisualizationEnum } from "@/lib/ui/preprocess";
import { InfoDeProduto } from "@/lib/proc/combinacoes";
import { PromptDefinitionType } from "@/lib/ai/prompt-types";
import React from "react";

export function TestTable({ testset, test, promptFormat }: { testset: IATestset, test: IATest, promptFormat: string | null }) {
    return <table className="table table-sm table-striped">
        <thead>
            <tr><th>Teste</th>{Array.from({ length: ATTEMPTS }).map((_, idx) => (<th key={`th-${idx}`}>{idx + 1}</th>))}<th key="th-score" style={{ textAlign: 'right' }}>%</th></tr>
        </thead>
        <tbody key="test-table-body">
            {testset.content.tests.map((t, idxTest) => <React.Fragment key={`test-fragment-${idxTest}`}>
                <tr key={`test-${t.name}`}>
                    <td>{t.name}</td>
                    {Array.from({ length: ATTEMPTS }).map((_, idx) => (<td key={`td-prompt-${idxTest}-${idx}`}>{
                        (idx < test.content.tests[idxTest].attempts.length && test.content.tests[idxTest].attempts[idx].result)
                            ?
                            <OverlayTrigger
                                trigger="click"
                                placement="left"
                                overlay={
                                    <Popover id={`popover-${idxTest}-${idx}-result`}>
                                        <Popover.Header as="h3">Resultado do Prompt</Popover.Header>
                                        <Popover.Body dangerouslySetInnerHTML={{
                                            __html: preprocess(
                                                test.content.tests[idxTest].attempts[idx].result,
                                                { kind: '', prompt: '', format: promptFormat } as PromptDefinitionType,
                                                { textos: testset.content.tests[idxTest].texts?.map(t => ({ descr: t.name, slug: t.name, texto: t.value })) },
                                                true, VisualizationEnum.DIFF).text
                                        }} />
                                    </Popover>
                                }>
                                <FontAwesomeIcon icon={faComment} className="text-primary" />
                            </OverlayTrigger>
                            : ''
                    }</td>))}
                    <td></td>
                </tr>
                {t.questions.map((question, idxQuestion) =>
                    <tr key={`question-${question.question}`}>
                        <td className="ps-4">{question.question.length > 100 ? question.question.substring(0, 99) + '...' : question.question}</td>
                        {Array.from({ length: ATTEMPTS }).map((_, idx) => (<td key={`td-question-${idxTest}-${idxQuestion}-${idx}`}>{
                            (idx < test.content.tests[idxTest].attempts.length && idxQuestion < test.content.tests[idxTest].attempts[idx].answers.length)
                                ? <OverlayTrigger
                                    trigger="click"
                                    placement="left"
                                    overlay={
                                        <Popover id={`popover-${idxTest}-${idx}-result`}>
                                            <Popover.Header as="h3">Avaliação de Resultado</Popover.Header>
                                            <Popover.Body>
                                                <p><strong>Pergunta:</strong> {test.content.tests[idxTest].questions[idxQuestion].question}</p>
                                                <p><strong>Trecho Identificado:</strong> {test.content.tests[idxTest].attempts[idx].answers[idxQuestion].snippet}</p>
                                                <p><strong>Resposta:</strong> {test.content.tests[idxTest].attempts[idx].answers[idxQuestion].result ? 'Sim' : 'Não'}</p>
                                                <p><strong>Justificativa:</strong> {test.content.tests[idxTest].attempts[idx].answers[idxQuestion].justification}</p>
                                            </Popover.Body>
                                        </Popover>
                                    }>
                                    {test.content.tests[idxTest].attempts[idx].answers[idxQuestion].result === true
                                        ? <FontAwesomeIcon icon={faCheck} className="text-success" />
                                        : test.content.tests[idxTest].attempts[idx].answers[idxQuestion].result === false
                                            ? <FontAwesomeIcon icon={faX} className="text-danger" />
                                            : <FontAwesomeIcon icon={faBrain} className="text-warning" />}
                                </OverlayTrigger>
                                : ''
                        }</td>))}
                        <td style={{ textAlign: 'right' }}>{scorePerQuestion(test.content.tests[idxTest], idxQuestion).toFixed(0)}</td>
                    </tr>)}
            </React.Fragment>)}
            <tr key="footer">
                <td style={{ textAlign: 'left', paddingRight: '1em' }}>Total %</td>
                {Array.from({ length: ATTEMPTS }).map((_, idx) => (<td key={`td-score-${idx}`}>{scorePerAttempt(test.content.tests, idx).toFixed(0)}</td>))}
                <td style={{ textAlign: 'right' }}><strong>{score(test.content.tests).toFixed(0)}</strong></td>
            </tr>
        </tbody>
    </table>
}