'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'
import { Evaluation } from '../lib/evaluation'

export const dynamic = 'force-dynamic'

export default function AiEvaluation(params) {
    const [evaluationId, setEvaluationId] = useState('')
    const [descr, setDescr] = useState('')
    const [processing, setProcessing] = useState(false)

    const handleSave = () => { params.onClose(evaluationId, descr); setEvaluationId(''); setDescr('') }
    const handleClose = () => { params.onClose(); setEvaluationId(''); setDescr('') }
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (evaluationId) handleSave() }

    return (
        <Modal show={params.show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Identificação de Problema</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={(event) => handleSubmit(event)}>
                    <Form.Select aria-label="Motivo Principal" value={evaluationId} onChange={e => setEvaluationId(e.target.value)} className='w-100 mt-2'>
                        <option value={undefined} hidden>Selecione uma opção</option>
                        {Evaluation.map(e => (
                            <option key={e.id} value={e.id}>{e.descr}</option>))}
                    </Form.Select>
                    <Form.Control placeholder='Detalhamento (Opcional)' aria-label="Detalhamento (opcional)" className='mt-2 w-100' type='input' value={descr} onChange={e => setDescr(e.target.value)}></Form.Control>
                </form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Fechar
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={processing || !evaluationId} title={(!evaluationId && !processing) ? 'Selecione um motivo principal' : undefined}>
                    Salvar
                </Button>
            </Modal.Footer>
        </Modal>
    )
}