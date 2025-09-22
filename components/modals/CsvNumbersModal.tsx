'use client'

import { useState } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import ProcessTextarea from '../ProcessTextarea'

export default function CsvNumbersModal({ show, title, onClose, onConfirm }: { show: boolean, title: string, onClose: () => void, onConfirm: (numbers: string[]) => void }) {
  const [text, setText] = useState('')

  const preprocess = (value: string) => {
    value = value.replaceAll(/(:.*?)$/gm, '')
    value = value.replaceAll('\n\n', '\n').replaceAll('\n', ',').replaceAll(/[^\d,]/g, '').replaceAll(',', ', ')
    return value
  }

  const extract = (t: string): string[] => {
    const regex = /\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d{1}\s*\.\s*\d{2}\s*\.\s*\d{4}|\d{20}/g
    const matches = t.match(regex)
    return matches ? matches.map(m => m.replace(/\D/g, '')) : []
  }

  const handleConfirm = () => {
    const arr = extract(text)
    onConfirm(arr)
    setText('')
    onClose()
  }

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Números de processos (CSV ou linhas)</Form.Label>
          <ProcessTextarea autoFocus={true}
            className="form-control"
            value={text}
            onChange={e => setText(e)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleConfirm}>Confirmar</Button>
      </Modal.Footer>
    </Modal>
  )
}
