"use client"
import { useEffect, useState, useRef } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import { ModalProps } from '../context'

export default function AskProcessNumberModal(props: ModalProps<{ processNumber?: string }>) {
  const { show, initial, draft, onSubmit, onClose, context } = props
  const [processNumber, setProcessNumber] = useState<string>(initial?.processNumber || context.processNumber || draft?.processNumber || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setProcessNumber(initial?.processNumber || context.processNumber || draft?.processNumber || '')
    // include context.processNumber, draft?.processNumber, initial?.processNumber as dependencies
  }, [show, context.processNumber, draft?.processNumber, initial?.processNumber])

  useEffect(() => {
    if (show && inputRef.current) {
      // Delay para aguardar a animação do modal
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [show])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && processNumber?.trim()) {
      e.preventDefault()
      onSubmit({ processNumber })
    }
  }

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {context.hasAttachedFiles 
            ? 'Informar número do processo (opcional)'
            : 'Informar número do processo'
          }
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group controlId="ask-process-number">
          <Form.Label>Por favor, informe o número do processo:</Form.Label>
          <Form.Control
            ref={inputRef}
            type="text"
            value={processNumber}
            onChange={(e) => setProcessNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            name="numeroDoProcesso"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={() => onSubmit({ processNumber })}
          disabled={!context.hasAttachedFiles && !processNumber?.trim()}
          title={!context.hasAttachedFiles && !processNumber?.trim() ? 'Informe o número do processo (ou anexe arquivos)' : undefined}
        >
          Confirmar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
