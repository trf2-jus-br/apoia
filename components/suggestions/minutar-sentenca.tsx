"use client"
import { ModalProps, SuggestionContext } from './context'
import { Suggestion } from './base'
import { Modal, Button, Form } from 'react-bootstrap'
import { useEffect, useState, useRef } from 'react'
import { faGavel } from '@fortawesome/free-solid-svg-icons'

export const id = 'draft-sentence'
export const label = 'Sentença'

export class MinutarSentencaSuggestion extends Suggestion {
  constructor() { super(id, label, faGavel, DraftSentenceModal, ['PRIMEIRO_GRAU'], false) }
  resolve(ctx: SuggestionContext) {
    return {
      type: 'modal' as const,
      key: id,
      initial: { processNumber: ctx.processNumber },
      onSubmit: (values: any, context: SuggestionContext) => {
        const numero = values?.processNumber?.trim()
        if (!numero) return
        if (numero !== context.processNumber) context.setProcessNumber(numero)
        const prompt = `Minute uma sentença para o processo ${numero}. Decisão: ${values?.decision}. ${values?.fundamentacao ? `Fundamentação: ${values?.fundamentacao}` : ''}`
        context.sendPrompt(prompt)
      }
    }
  }
}

export const suggestion = new MinutarSentencaSuggestion()

export default function DraftSentenceModal(props: ModalProps<{ processNumber?: string, decision?: 'procedente' | 'improcedente', fundamentacao?: string }>) {
  const { show, initial, draft, onSubmit, onClose, context } = props
  const [processNumber, setProcessNumber] = useState<string>(initial?.processNumber || context.processNumber || draft?.processNumber || '')
  const [decision, setDecision] = useState<'' | 'procedente' | 'improcedente'>(draft?.decision || '')
  const [fundamentacao, setFundamentacao] = useState<string>(draft?.fundamentacao || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (show) {
      setProcessNumber(initial?.processNumber || context.processNumber || draft?.processNumber || '')
    }
    // include context.processNumber, draft?.processNumber, initial?.processNumber as dependencies
  }, [show, context.processNumber, draft?.processNumber, initial?.processNumber])

  useEffect(() => {
    if (show) {
      // Delay para aguardar a animação do modal
      const timer = setTimeout(() => {
        if (!context.processNumber && inputRef.current) {
          inputRef.current.focus()
        } else if (selectRef.current) {
          selectRef.current.focus()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [show, context.processNumber])

  const canSubmit = processNumber.trim().length > 0 && decision

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      onSubmit({ processNumber, decision, fundamentacao })
    }
  }

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Minutar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className={`mb-3 ${context.processNumber ? 'd-none' : ''}`} controlId="minutar-process-number">
          <Form.Label>Número do processo</Form.Label>
          <Form.Control ref={inputRef} name="numeroDoProcesso" value={processNumber} onChange={(e) => setProcessNumber(e.target.value)} onKeyDown={handleKeyDown} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="minutar-decision">
          <Form.Label>Decisão</Form.Label>
          <Form.Select ref={selectRef} value={decision} onChange={(e) => setDecision(e.target.value as any)} onKeyDown={handleKeyDown}>
            <option value="">[Selecione]</option>
            <option value="procedente">Procedente</option>
            <option value="improcedente">Improcedente</option>
          </Form.Select>
        </Form.Group>
        <Form.Group controlId="minutar-fundamentacao">
          <Form.Label>Fundamentação</Form.Label>
          <Form.Control as="textarea" rows={6} value={fundamentacao} onChange={(e) => setFundamentacao(e.target.value)} onKeyDown={handleKeyDown} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={() => onSubmit({ processNumber, decision, fundamentacao })} title={!canSubmit ? 'Informe o número do processo e a decisão' : undefined}>Gerar</Button>
      </Modal.Footer>
    </Modal>
  )
}
