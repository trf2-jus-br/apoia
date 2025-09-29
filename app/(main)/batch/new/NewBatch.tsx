'use client'

import { useEffect, useState } from 'react'
import { Container, Form, Button, Alert } from 'react-bootstrap'
import Fetcher from '@/lib/utils/fetcher'
import { TiposDeSinteseValido } from '@/lib/proc/info-de-produto'
import { StatusDeLancamento } from '@/lib/proc/process-types'
import { useRouter } from 'next/navigation'
import ProcessTextarea from '@/components/ProcessTextarea'

export default function NewBatchPage(props: { favorites: any[] }) {
  const [name, setName] = useState('')
  const [tipo, setTipo] = useState('RESUMOS_TRIAGEM')
  const [complete, setComplete] = useState(false)
  const [numbers, setNumbers] = useState('')
  const [err, setErr] = useState('')
  const router = useRouter()

  const [tipos, setTipos] = useState<{ value: string, label: string }[]>([])

  useEffect(() => {
    const base = TiposDeSinteseValido
      .filter(t => t.status <= StatusDeLancamento.PUBLICO && t.relatorioDeAcervo)
      .map(t => ({ value: t.id, label: t.nome }))
    const favs = props.favorites.map((f: any) => ({ value: String(f.base_id), label: `[Favorito] ${f.name}` }))
    setTipos([...base, ...favs])
    // props.favorites added to deps so favorites list updates if prop changes
  }, [props.favorites])

  const preprocess = (value: string) => value.replaceAll(/(:.*?)$/gm, '').replaceAll('\n', ',').replaceAll(/[^\d,]/g, '').replaceAll(',', '\n').replaceAll('\n\n', '\n').trim()

  const create = async () => {
    setErr('')
    try {
      const arr = numbers.split(',').map(s => s.trim()).filter(Boolean)
      const isNumeric = /^\d+$/.test(tipo)
      const payload: any = { name, complete, numbers: arr }
      if (isNumeric) payload.prompt_base_id = Number(tipo)
      else payload.tipo_de_sintese = tipo
      const res = await Fetcher.post('/api/v1/batch', payload)
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
          <ProcessTextarea value={numbers} onChange={e => setNumbers(e)} />
        </Form.Group>
        <Button onClick={create} disabled={!name || !numbers.trim()}>Criar</Button>
      </Form>
    </Container>
  )
}
