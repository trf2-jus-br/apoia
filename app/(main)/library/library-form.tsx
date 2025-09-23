'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Modal, Table } from 'react-bootstrap'
import AiContent from '@/components/ai-content'
import TextareaAutosize from 'react-textarea-autosize'
import { findUnclosedMarking } from '@/lib/ai/template'

type LibraryType = 'ARQUIVO' | 'MODELO' | 'MARKDOWN'
type ModelSubtype = 'PRIMEIRO_DESPACHO' | 'SENTENCA' | 'VOTO'

export default function LibraryForm({ record }: { record: any }) {
  const [data, setData] = useState<any>({ ...record })
  const [pending, setPending] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [showExamples, setShowExamples] = useState(false)
  const [csv, setCsv] = useState('')
  const [examples, setExamples] = useState<any[]>([])
  // examples table is always visible when there are examples
  const [runningAI, setRunningAI] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [promptDefinition, setPromptDefinition] = useState<any>(null)
  const [selecting, setSelecting] = useState<{ pn: string, pieces: any[] } | null>(null)
  const [selectedPieceId, setSelectedPieceId] = useState<string>('')
  const isModel = data.type === 'MODELO'

  useEffect(() => { setData({ ...record }) }, [record])
  useEffect(() => {
    const load = async () => {
      if (!record?.id) return
      const res = await fetch(`/api/v1/library/${record.id}/examples`)
      const j = await res.json()
      setExamples(j.items || [])
    }
    load()
  }, [record?.id])

  const unclosed = useMemo(() => {
    return isModel ? findUnclosedMarking(data.content_markdown || '') : null
  }, [isModel, data.content_markdown])

  const save = async () => {
    setPending(true)
    try {
      if (data.id) {
        await fetch(`/api/v1/library/${data.id}`, { method: 'PATCH', body: JSON.stringify({
          title: data.title,
          content_markdown: data.content_markdown,
          content_type: data.content_type,
          model_subtype: data.model_subtype,
        }) })
      } else {
        // create
        let res: Response
        if (data.type === 'ARQUIVO') {
          if (!file) {
            setFileError('Selecione um arquivo para enviar')
            return
          }
          if (file.size > 10 * 1024 * 1024) {
            setFileError('Arquivo maior que 10MB')
            return
          }
          const form = new FormData()
          form.append('type', data.type)
          form.append('title', data.title || '')
          form.append('file', file)
          res = await fetch('/api/v1/library', { method: 'POST', body: form })
        } else {
          res = await fetch('/api/v1/library', { method: 'POST', body: JSON.stringify({
            type: data.type,
            title: data.title,
            content_markdown: data.content_markdown,
            content_type: data.content_type,
            model_subtype: data.model_subtype,
          }) })
        }
        const j = await res.json()
        if (res.ok) {
          window.location.href = `/library/${j.id}/edit`
          return
        }
      }
    } finally {
      setPending(false)
    }
  }

  const ensureSavedBeforeExamples = async () => {
    // If item doesn't exist yet, save it first then return the new id
    if (data.id) return data.id
    setPending(true)
    try {
      let res: Response
      if (data.type === 'ARQUIVO') {
        if (!file) {
          setFileError('Selecione um arquivo para enviar')
          return null
        }
        if (file.size > 10 * 1024 * 1024) {
          setFileError('Arquivo maior que 10MB')
          return null
        }
        const form = new FormData()
        form.append('type', data.type)
        form.append('title', data.title || '')
        form.append('file', file)
        res = await fetch('/api/v1/library', { method: 'POST', body: form })
      } else {
        res = await fetch('/api/v1/library', { method: 'POST', body: JSON.stringify({
          type: data.type,
          title: data.title,
          content_markdown: data.content_markdown,
          content_type: data.content_type,
          model_subtype: data.model_subtype,
        }) })
      }
      const j = await res.json()
      if (res.ok) {
        // instead of redirect, keep on page and update state
        setData((d: any) => ({ ...d, id: j.id }))
        return j.id as number
      }
      return null
    } finally {
      setPending(false)
    }
  }

  const addExamples = async () => {
    // Ensure exists
    const id = await ensureSavedBeforeExamples()
    if (!id) return
    setPending(true)
    try {
      await fetch(`/api/v1/library/${id}/examples`, { method: 'POST', body: JSON.stringify({ processNumbers: csv, pieceType: data.model_subtype === 'PRIMEIRO_DESPACHO' ? 'DESPACHO_DECISAO' : data.model_subtype || undefined }) })
      const list = await fetch(`/api/v1/library/${id}/examples`)
      const j = await list.json()
      setExamples(j.items || [])
      setShowExamples(false)
      setCsv('')
    } finally {
      setPending(false)
    }
  }

  const removeExample = async (pn: string) => {
    await fetch(`/api/v1/library/${data.id}/examples?process_number=${pn}`, { method: 'DELETE' })
    const list = await fetch(`/api/v1/library/${data.id}/examples`)
    const j = await list.json()
    setExamples(j.items || [])
  }

  const openSelectPiece = async (pn: string) => {
    const res = await fetch(`/api/v1/process/${pn}`)
    const j = await res.json()
    const list = (j.arrayDeDadosDoProcesso?.at(-1)?.pecas || []) as any[]
    setSelecting({ pn, pieces: list })
    setSelectedPieceId('')
  }

  const confirmSelectPiece = async () => {
    if (!selecting || !selectedPieceId) return
    await fetch(`/api/v1/library/${data.id}/examples`, { method: 'PATCH', body: JSON.stringify({ processNumber: selecting.pn, pieceId: selectedPieceId }) })
    const list = await fetch(`/api/v1/library/${data.id}/examples`)
    const j = await list.json()
    setExamples(j.items || [])
    setSelecting(null)
  }

  const generateFromExamples = async () => {
    setRunningAI(true)
    try {
      const defRes = await fetch('/api/v1/internal-prompt/template-a-partir-de-exemplos')
      const definition = await defRes.json()
      setPromptDefinition(definition)
      setShowAI(true)
    } finally {
      setRunningAI(false)
    }
  }

  return (
    <div className="row">
      <div className="col-8">
        <Form.Group className="mb-3">
          <Form.Label>Título</Form.Label>
          <Form.Control value={data.title || ''} onChange={e => setData({ ...data, title: e.target.value })} />
        </Form.Group>

        {(data.type === 'MARKDOWN' || data.type === 'MODELO') && (
          <Form.Group className="mb-3">
            <Form.Label>{data.type === 'MODELO' ? 'Modelo' : 'Documento (Markdown)'}</Form.Label>
            <TextareaAutosize className="form-control" minRows={10} value={data.content_markdown || ''} onChange={e => setData({ ...data, content_markdown: e.target.value })} />
            {isModel && unclosed && (
              <div className="alert alert-danger mt-2">
                Marcação não fechada: <strong>{unclosed.kind}</strong> na linha <strong>{unclosed.lineNumber}</strong> - <span className="template-error" dangerouslySetInnerHTML={{ __html: unclosed.lineContent }} />
              </div>
            )}
          </Form.Group>
        )}

        {data.type === 'ARQUIVO' && (
          <Form.Group className="mb-3">
            <Form.Label>Arquivo (máx. 10MB)</Form.Label>
            <Form.Control type="file" onChange={(e: any) => {
              const f = (e.target.files && e.target.files[0]) ? e.target.files[0] : null
              setFile(f)
              setFileError(null)
              if (f) setData({ ...data, content_type: f.type || 'application/octet-stream' })
            }} />
            {file && (
              <div className="form-text">{file.name} • {(file.size/1024/1024).toFixed(2)} MB • {file.type || 'application/octet-stream'}</div>
            )}
            {fileError && <div className="text-danger small mt-1">{fileError}</div>}
            {data.id && (
              <div className="text-muted small mt-2">Para itens existentes, somente o título pode ser alterado por enquanto.</div>
            )}
          </Form.Group>
        )}
      </div>

      <div className="col-4">
        <Form.Group className="mb-3">
          <Form.Label>Tipo</Form.Label>
          <Form.Select value={data.type} onChange={e => setData({ ...data, type: e.target.value as LibraryType })} disabled={!!data.id}>
            <option value="ARQUIVO">Arquivo</option>
            <option value="MODELO">Modelo</option>
            <option value="MARKDOWN">Markdown</option>
          </Form.Select>
        </Form.Group>

        {isModel && (
          <Form.Group className="mb-3">
            <Form.Label>Tipo de Modelo</Form.Label>
            <Form.Select value={data.model_subtype || ''} onChange={e => setData({ ...data, model_subtype: (e.target.value || null) as ModelSubtype | null })}>
              <option value="">Selecione</option>
              <option value="PRIMEIRO_DESPACHO">Primeiro Despacho</option>
              <option value="SENTENCA">Sentença</option>
              <option value="VOTO">Voto</option>
            </Form.Select>
          </Form.Group>
        )}

        <div className="d-flex gap-2 flex-wrap">
          {isModel && (
            <Button variant="light" onClick={async () => {
              // ensure saved before opening modal
              const id = await ensureSavedBeforeExamples()
              if (id) setShowExamples(true)
            }}>Acrescentar Exemplos</Button>
          )}
          {isModel && examples.length > 0 && (
            <Button variant="secondary" disabled={runningAI} onClick={generateFromExamples}>Gerar modelo a partir dos exemplos</Button>
          )}
          <Button variant="primary" disabled={pending} onClick={save}>Salvar</Button>
        </div>
      </div>

      {examples.length > 0 && (
        <div className="col-12 mt-4">
          <h5>Exemplos</h5>
          <Table bordered hover>
            <thead>
              <tr>
                <th>Nº do Processo</th>
                <th>Evento</th>
                <th>Peça</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {examples.map(ex => (
                <tr key={ex.id}>
                  <td>{ex.process_number}</td>
                  <td>{ex.event_number || '-'}</td>
                  <td>{ex.piece_title || '-'}</td>
                  <td className="text-end">
                    <Button size="sm" variant="light" className="me-2" onClick={() => openSelectPiece(ex.process_number)}>Selecionar peça</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => removeExample(ex.process_number)}>Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {showAI && promptDefinition && (
        <div className="col-12 mt-3">
          <div className="alert alert-info">Gerando modelo a partir dos exemplos...</div>
          <AiContent
            definition={promptDefinition}
            data={{ textos: examples.map((ex, idx) => ({
              descr: ex.piece_title || `Exemplo ${idx + 1}`,
              slug: `exemplo-${idx + 1}`,
              texto: ex.content_markdown ? `<despacho-decisao>\n${ex.content_markdown}\n</despacho-decisao>` : '',
              sigilo: '0',
            })) }}
            config={{ prompt_slug: 'template-a-partir-de-exemplos' }}
            dossierCode={''}
            onReady={(content) => {
              setData((d: any) => ({ ...d, content_markdown: content?.raw || '' }))
              setShowAI(false)
            }}
          />
        </div>
      )}

      <Modal show={!!selecting} onHide={() => setSelecting(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Selecionar peça</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Peça do processo {selecting?.pn}</Form.Label>
            <Form.Select value={selectedPieceId} onChange={e => setSelectedPieceId(e.target.value)}>
              <option value="">Selecione</option>
              {selecting?.pieces?.map(p => (
                <option key={p.id} value={p.id}>{p.descr}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelecting(null)}>Cancelar</Button>
          <Button variant="primary" disabled={!selectedPieceId} onClick={confirmSelectPiece}>Confirmar</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showExamples} onHide={() => setShowExamples(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Acrescentar Exemplos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Números de processos (separados por vírgula)</Form.Label>
            <Form.Control as="textarea" rows={3} value={csv} onChange={e => setCsv(e.target.value)} />
          </Form.Group>
          <div className="text-muted small mt-2">Itens já existentes serão ignorados.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExamples(false)}>Cancelar</Button>
          <Button variant="primary" onClick={addExamples} disabled={pending || !csv.trim()}>Confirmar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
