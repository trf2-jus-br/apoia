"use client"
import { useEffect, useState } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import { ModalProps } from '../context'

export default function AskProcessNumberModal(props: ModalProps<{ processNumber?: string }>) {
  const { show, initial, draft, onSubmit, onClose, context } = props
  const [processNumber, setProcessNumber] = useState<string>(initial?.processNumber || context.processNumber || draft?.processNumber || '')

  useEffect(() => {
    setProcessNumber(initial?.processNumber || context.processNumber || draft?.processNumber || '')
    // include context.processNumber, draft?.processNumber, initial?.processNumber as dependencies
  }, [show, context.processNumber, draft?.processNumber, initial?.processNumber])

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Informar número do processo</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Por favor, informe o número do processo:</Form.Label>
          <Form.Control
            type="text"
            value={processNumber}
            onChange={(e) => setProcessNumber(e.target.value)}
            name="numeroDoProcesso"
            autoFocus
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={() => onSubmit({ processNumber })} disabled={!processNumber?.trim()}>
          Confirmar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
