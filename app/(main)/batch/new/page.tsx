'use client'

import { useState } from 'react'
import { Container, Form, Button, Alert } from 'react-bootstrap'
import Fetcher from '@/lib/utils/fetcher'
import { TiposDeSinteseValido } from '@/lib/proc/info-de-produto'
import { StatusDeLancamento } from '@/lib/proc/process-types'
import { useRouter } from 'next/navigation'

export default function NewBatchPage() {
  const [name, setName] = useState('')
  const [tipo, setTipo] = useState('RESUMOS_TRIAGEM')
  const [complete, setComplete] = useState(false)
  const [numbers, setNumbers] = useState('')
  const [err, setErr] = useState('')
  const router = useRouter()

  const tipos = TiposDeSinteseValido.filter(t => t.status <= StatusDeLancamento.PUBLICO).map(t => ({ value: t.id, label: t.nome }))

  const preprocess = (value: string) => value.replaceAll(/(:.*?)$/gm, '').replaceAll('\n', ',').replaceAll(/[^\d,]/g, '').replaceAll(',', '\n').replaceAll('\n\n', '\n').trim()

  const create = async () => {
    setErr('')
    try {
      const arr = numbers.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await Fetcher.post('/api/v1/batches', { name, tipo_de_sintese: tipo, complete, numbers: arr })
      if (res?.batch?.id) router.push(`/batch/${res.batch.id}`)
      else setErr(res?.errormsg || 'Erro ao criar')
    } catch (e: any) {
      setErr(e?.message || String(e))
    }
  }

  return (
    <Container className="mt-3">
      <h1>Novo Relatório</h1>
      {err && <Alert variant="danger">{err}</Alert>}
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Nome</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tipo de Síntese</Form.Label>
          <Form.Select value={tipo} onChange={e => setTipo(e.target.value)}>
            {tipos.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check type="checkbox" label="Completo" checked={complete} onChange={e => setComplete(e.target.checked)} />
          <div className="text-body-tertiary">O custo é bem superior quando é realizada a análise completa.</div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Processos</Form.Label>
          <Form.Control as="textarea" rows={8} value={numbers} onChange={e => setNumbers(preprocess(e.target.value))} />
        </Form.Group>
        <Button onClick={create} disabled={!name || !numbers.trim()}>Criar</Button>
      </Form>
    </Container>
  )
}
