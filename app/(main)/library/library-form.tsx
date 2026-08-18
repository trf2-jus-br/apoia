'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { Button, Form, Modal, Table } from 'react-bootstrap'
import AiContent from '@/components/ai-content'
import { findUnclosedMarking } from '@/lib/ai/template'
import LibraryAttachments from '@/components/library-attachments'
import { deleteLibraryAction } from '@/app/(main)/library/actions'

const EditorComp = dynamic(() => import('@/components/EditorComponent'), { ssr: false })
import { IALibraryKind, IALibraryKindLabels, IALibraryInclusion, IALibraryInclusionLabels, IALibraryShare, IALibraryShareLabels, IAModelSubtype, IAModelSubtypeLabels } from '@/lib/db/mysql-types'
import { useRouter } from 'next/navigation'
import ProcessTextarea from '@/components/ProcessTextarea'
import { useModeUrl } from '@/lib/utils/use-mode-url'

export default function LibraryForm({ record, promptDefinition }: { record: any, promptDefinition: any }) {
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
  const [selecting, setSelecting] = useState<{ pn: string, pieces: any[] } | null>(null)
  const [selectedPieceId, setSelectedPieceId] = useState<string>('')
  const [editorKey, setEditorKey] = useState(0)
  const isGuideline = data.kind === IALibraryKind.GUIDELINE
  const isReadOnly = data.id && !data.is_mine

  const router = useRouter()
  const modeUrl = useModeUrl()

  useEffect(() => { setData({ ...record }) }, [record])
  useEffect(() => {
    const load = async () => {
      if (!record?.id) return
      const res = await fetch(modeUrl(`/api/v1/library/${record.id}/examples`))
      const j = await res.json()
      setExamples(j.items || [])
    }
    load()
  }, [record?.id])

  const unclosed = useMemo(() => {
    return isGuideline ? findUnclosedMarking(data.content_markdown || '') : null
  }, [isGuideline, data.content_markdown])

  const save = async (stayOnPage = false, callback?: () => void) => {
    if (!data.title || data.title.trim() === '') {
      alert('O título é obrigatório')
      return
    }

    setPending(true)
    try {
      if (data.id) {
        // Update existing record (cria nova versão do documento)
        await fetch(modeUrl(`/api/v1/library/${data.id}`), {
          method: 'PATCH',
          body: JSON.stringify({
            title: data.title,
            content_markdown: data.content_markdown,
            content_type: data.content_type,
            model_subtype: data.model_subtype,
            inclusion: data.inclusion,
            context: data.context,
            share: data.share || IALibraryShare.PRIVADO,
          })
        })
      } else {
        // Create new record
        let res: Response

        if (data.kind === IALibraryKind.ARQUIVO) {
          if (!file) {
            setFileError('Selecione um arquivo para enviar')
            return
          }
          if (file.size > 10 * 1024 * 1024) {
            setFileError('Arquivo maior que 10MB')
            return
          }
          const form = new FormData()
          form.append('kind', data.kind)
          form.append('title', data.title || '')
          form.append('share', data.share || IALibraryShare.PRIVADO)
          form.append('file', file)
          res = await fetch(modeUrl('/api/v1/library'), { method: 'POST', body: form })
        } else {
          res = await fetch(modeUrl('/api/v1/library'), {
            method: 'POST',
            body: JSON.stringify({
              kind: data.kind,
              title: data.title,
              content_markdown: data.content_markdown,
              content_type: data.content_type,
              model_subtype: data.model_subtype,
              inclusion: data.inclusion,
              context: data.context,
              share: data.share || IALibraryShare.PRIVADO,
            })
          })
        }

        if (!res.ok) {
          const j = await res.json()
          console.error('Error creating library item:', j)
          return
        }

        // If staying on page, update state with new id
        if (stayOnPage) {
          const j = await res.json()
          setData((d: any) => ({ ...d, id: j.id, is_mine: true }))
          return
        }
      }

      if (!stayOnPage) {
        router.push(`/library`)
      }
    } finally {
      setPending(false)
      if (callback) callback()
    }
  }

  const addExamples = async () => {
    setPending(true)
    try {
      await fetch(modeUrl(`/api/v1/library/${data.id}/examples`), { method: 'POST', body: JSON.stringify({ processNumbers: csv, pieceType: data.model_subtype === 'PRIMEIRO_DESPACHO' ? 'DESPACHO_DECISAO' : data.model_subtype || undefined }) })
      const list = await fetch(modeUrl(`/api/v1/library/${data.id}/examples`))
      const j = await list.json()
      setExamples(j.items || [])
      setShowExamples(false)
      setCsv('')
    } finally {
      setPending(false)
    }
  }

  const removeExample = async (pn: string) => {
    await fetch(modeUrl(`/api/v1/library/${data.id}/examples?process_number=${pn}`), { method: 'DELETE' })
    const list = await fetch(modeUrl(`/api/v1/library/${data.id}/examples`))
    const j = await list.json()
    setExamples(j.items || [])
  }

  const openSelectPiece = async (pn: string) => {
    const res = await fetch(modeUrl(`/api/v1/process/${pn}`))
    const j = await res.json()
    const list = (j.arrayDeDadosDoProcesso?.at(-1)?.pecas || []) as any[]
    setSelecting({ pn, pieces: list })
    setSelectedPieceId('')
  }

  const confirmSelectPiece = async () => {
    if (!selecting || !selectedPieceId) return
    await fetch(modeUrl(`/api/v1/library/${data.id}/examples`), { method: 'PATCH', body: JSON.stringify({ processNumber: selecting.pn, pieceId: selectedPieceId }) })
    const list = await fetch(modeUrl(`/api/v1/library/${data.id}/examples`))
    const j = await list.json()
    setExamples(j.items || [])
    setSelecting(null)
  }

  const generateFromExamples = async () => {
    setRunningAI(true)
    try {
      setShowAI(true)
    } finally {
      setRunningAI(false)
    }
  }

  return (
    <div className="row">
      {isReadOnly && (
        <div className="col-12">
          <div className="alert alert-info">Este documento é de outro usuário e está na sua biblioteca como favorito. Você não pode editá-lo.</div>
        </div>
      )}
      <div className="col-6">
        <Form.Group className="mb-3">
          <Form.Label>Título</Form.Label>
          <Form.Control value={data.title || ''} onChange={e => setData({ ...data, title: e.target.value })} disabled={isReadOnly} />
        </Form.Group>
      </div>

      <div className={`col-2`}>
        <Form.Group className="mb-3">
          <Form.Label>Tipo</Form.Label>
          <Form.Select value={data.kind} onChange={e => setData({ ...data, kind: e.target.value as IALibraryKind })} disabled={!!data.id}>
            {Object.entries(IALibraryKindLabels).filter(([value]) => value !== IALibraryKind.ARQUIVO).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      {isGuideline && (
        <div className="col-2">
          <Form.Group className="mb-3">
            <Form.Label>Tipo de Manual</Form.Label>
            <Form.Select value={data.model_subtype || ''} onChange={e => setData({ ...data, model_subtype: (e.target.value || null) as IAModelSubtype | null })} disabled={isReadOnly}>
              <option value="">Selecione</option>
              {Object.entries(IAModelSubtypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>
      )}

      <div className="col-2">
        <Form.Group className="mb-3">
          <Form.Label>Inclusão Automática</Form.Label>
          <Form.Select value={data.inclusion} onChange={e => setData({ ...data, inclusion: e.target.value as IALibraryInclusion })} disabled={isReadOnly}>
            {Object.entries(IALibraryInclusionLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      <div className="col-2">
        <Form.Group className="mb-3">
          <Form.Label>Compartilhamento</Form.Label>
          <Form.Select value={data.share || IALibraryShare.PRIVADO} onChange={e => setData({ ...data, share: e.target.value as IALibraryShare })} disabled={isReadOnly}>
            <option value={IALibraryShare.PADRAO} disabled={false}>{IALibraryShareLabels[IALibraryShare.PADRAO]}</option>
            {Object.entries(IALibraryShareLabels).filter(([value]) => value !== IALibraryShare.PADRAO).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      <div className="col-12" style={{ display: data.inclusion !== IALibraryInclusion.CONTEXTUAL ? 'none' : 'block' }}>
        <Form.Group className="mb-3">
          <Form.Label>Contexto</Form.Label>
          <Form.Control value={data.context || ''} onChange={e => setData({ ...data, context: e.target.value })} disabled={isReadOnly} />
          <div className="form-text text-muted">Explique para a IA em que contexto esse documento deve ser automaticamente considerado. Exemplo: &quot;Processo de propriedade industrial.&quot;</div>
        </Form.Group>
      </div>

      <div className="col-12">
        {(data.kind === IALibraryKind.MARKDOWN || data.kind === IALibraryKind.GUIDELINE) && (
          <Form.Group className="mb-3">
            <Form.Label>{data.kind === IALibraryKind.GUIDELINE ? 'Manual' : 'Documento'}</Form.Label>
            <div className="alert alert-secondary mb-1 p-0">
              <Suspense fallback={null}>
                <EditorComp key={editorKey} markdown={data.content_markdown || ''} onChange={(text) => setData({ ...data, content_markdown: text })} readOnly={isReadOnly} showPdfUpload={true} />
              </Suspense>
            </div>
            {isGuideline && unclosed && (
              <div className="alert alert-danger mt-2">
                Marcação não fechada: <strong>{unclosed.kind}</strong> na linha <strong>{unclosed.lineNumber}</strong> - <span className="template-error" dangerouslySetInnerHTML={{ __html: unclosed.lineContent }} />
              </div>
            )}
          </Form.Group>
        )}
      </div>
      <div className="col-12">
        {data.kind === IALibraryKind.ARQUIVO && (
          <Form.Group className="mb-3">
            <Form.Label>Arquivo (máx. 10MB)</Form.Label>
            <Form.Control type="file" onChange={(e: any) => {
              const f = (e.target.files && e.target.files[0]) ? e.target.files[0] : null
              setFile(f)
              setFileError(null)
              if (f) setData({ ...data, content_type: f.type || 'application/octet-stream' })
            }} disabled={isReadOnly} />
            {file && (
              <div className="form-text">{file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'application/octet-stream'}</div>
            )}
            {fileError && <div className="text-danger small mt-1">{fileError}</div>}
            {data.id && (
              <div className="text-muted small mt-2">Para itens existentes, somente o título pode ser alterado por enquanto.</div>
            )}
          </Form.Group>
        )}
      </div>
      {(data.share || IALibraryShare.PRIVADO) === IALibraryShare.PUBLICO && !isReadOnly && (
        <div className="col-12">
          <div className="alert alert-danger mt-0 mb-3">
            <p><strong>Atenção:</strong> Um documento público fica visível para todos os usuários.</p>
            <p className="mb-0">Para que seu documento permaneça público, certifique-se de <strong>revisar o conteúdo</strong> antes de disponibilizá-lo, a fim de verificar que ele apresenta as informações esperadas.</p>
          </div>
        </div>
      )}
      <div className="col-12">
        <div className="row">
          <div className="col">
            <Button variant="outline-secondary" onClick={() => router.replace('/library')}>Cancelar</Button>
            {data.id && data.is_mine && (<Button variant="outline-danger" className="ms-2" disabled={pending} onClick={async () => {
              if (confirm('Tem certeza que deseja excluir este item?')) {
                setPending(true)
                try {
                  const formData = new FormData()
                  formData.set('id', String(data.id))
                  await deleteLibraryAction(formData)
                  router.push('/library')
                } catch (error) {
                  console.error('Erro ao excluir:', error)
                  alert('Erro ao excluir o item')
                } finally {
                  setPending(false)
                }
              }
            }
            }>Excluir</Button>
            )}
            {data.id && !data.is_mine && (
              <Button variant="outline-danger" className="ms-2" disabled={pending} onClick={async () => {
                if (confirm('Deseja remover este item da sua biblioteca?')) {
                  router.push(`/library/${data.id}/reset-favorite`)
                }
              }}>Remover da Biblioteca</Button>
            )}
          </div>
          <div className="col text-end">
            {isGuideline && examples.length > 0 && !isReadOnly && (
              <Button
                variant="outline-primary"
                className="me-2"
                disabled={runningAI}
                onClick={generateFromExamples}
              >Gerar Manual com IA</Button>
            )}

            {isGuideline && !isReadOnly && data.id && (
              <Button
                variant="outline-primary"
                disabled={pending || !data.title || data.title.trim() === '' || (data.kind === IALibraryKind.GUIDELINE && !data.model_subtype)}
                className="me-2"
                onClick={async () => { setShowExamples(true) }}>Acrescentar Exemplos</Button>
            )}
            {!isReadOnly && !data.id && (
              <Button
                variant="outline-primary"
                disabled={pending || !data.title || data.title.trim() === '' || (data.kind === IALibraryKind.GUIDELINE && !data.model_subtype)}
                onClick={() => save(true, () => setShowExamples(true))}
                className="me-2"
              >
                Incluir {isGuideline ? 'Exemplos' : 'Anexos'}
              </Button>
            )}
            {!isReadOnly && (
              <Button
                variant="primary"
                disabled={pending || !data.title || data.title.trim() === ''}
                onClick={() => save(false)}
              >
                Salvar
              </Button>
            )}
          </div>
        </div>
      </div>

      {data.id && !isGuideline && (
        <div className="col-12 mt-4">
          <LibraryAttachments libraryId={data.id} />
        </div>
      )}

      {
        examples.length > 0 && (
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
                      {!isReadOnly && (
                        <>
                          <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openSelectPiece(ex.process_number)}>Selecionar peça</Button>
                          <Button size="sm" variant="outline-danger" onClick={() => removeExample(ex.process_number)}>Excluir</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )
      }

      <Modal show={showAI && !!promptDefinition} onHide={() => setShowAI(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Gerar manual a partir dos exemplos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showAI && promptDefinition && (
            <>
              <AiContent
                definition={promptDefinition}
                data={{
                  textos: examples.map((ex, idx) => ({
                    numeroDoProcesso: '',
                    descr: ex.piece_title || `Exemplo ${idx + 1}`,
                    slug: `exemplo-${idx + 1}`,
                    texto: ex.content_markdown || '',
                    sigilo: '0',
                  }))
                }}
                config={{ prompt_slug: 'guideline-a-partir-de-exemplos' }}
                dossierCode={''}
                onReady={(content) => {
                  setData((d: any) => ({ ...d, content_markdown: content?.raw || '' }))
                  setEditorKey(k => k + 1)
                  setShowAI(false)
                }}
              />
              <p className="text-muted mt-2">Aguarde enquanto o manual é gerado. Quando concluído, será automaticamente transferido para o formulário.</p>
            </>
          )}
        </Modal.Body>
      </Modal>

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
            <ProcessTextarea rows={3} value={csv} onChange={e => setCsv(e)} />
          </Form.Group>
          <div className="text-muted small mt-2">Itens já existentes serão ignorados.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExamples(false)}>Cancelar</Button>
          <Button variant="primary" onClick={addExamples} disabled={pending || !csv.trim()}>Confirmar</Button>
        </Modal.Footer>
      </Modal>
    </div >
  )
}
