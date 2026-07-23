'use client'

import { useCallback, useState, DragEvent } from 'react'
import { Button, Toast, ToastContainer, Spinner } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faTrash, faUpload, faFilePdf } from '@fortawesome/free-solid-svg-icons'

type Attachment = {
  id: number
  library_id: number
  filename: string
  content_type: string
  file_size: number
  word_count: number | null
  created_at: string | null
}

type ToastMessage = {
  id: number
  type: 'success' | 'error' | 'warning'
  message: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatNumber = (num: number | null): string => {
  if (num === null) return '-'
  return num.toLocaleString('pt-BR')
}

export default function LibraryAttachments({ libraryId }: { libraryId: number }) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  const addToast = (type: 'success' | 'error' | 'warning', message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const loadAttachments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/library/${libraryId}/attachments`)
      if (!res.ok) throw new Error('Erro ao carregar anexos')
      const data = await res.json()
      setAttachments(data.attachments || [])
    } catch (err: any) {
      addToast('error', err.message)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [libraryId])

  if (!initialized && !loading) {
    loadAttachments()
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []
    const existingFilenames = new Set(attachments.map(att => att.filename))

    for (const file of filesArray) {
      if (file.type !== 'application/pdf') {
        errors.push(`"${file.name}" não é PDF`)
        continue
      }
      if (file.size > 1 * 1024 * 1024) {
        errors.push(`"${file.name}" maior que 1MB`)
        continue
      }
      if (existingFilenames.has(file.name)) {
        errors.push(`"${file.name}" já foi enviado`)
        continue
      }
      validFiles.push(file)
      existingFilenames.add(file.name)
    }

    const totalAfterUpload = attachments.length + validFiles.length
    if (totalAfterUpload > 10) {
      const available = 10 - attachments.length
      addToast('error', `Limite de 10 anexos seria excedido. Você pode adicionar apenas ${available} arquivo(s).`)
      return
    }

    if (validFiles.length === 0) {
      addToast('error', errors.join(', '))
      return
    }

    if (errors.length > 0) {
      addToast('warning', `Alguns arquivos foram ignorados: ${errors.join(', ')}`)
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: validFiles.length })

    const successfulUploads: string[] = []
    const failedUploads: string[] = []

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      setUploadProgress({ current: i + 1, total: validFiles.length })

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/v1/library/${libraryId}/attachments`, {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.errormsg || 'Erro ao fazer upload')
        }

        successfulUploads.push(file.name)
      } catch (err: any) {
        failedUploads.push(`"${file.name}": ${err.message}`)
      }
    }

    if (successfulUploads.length > 0) {
      if (successfulUploads.length === 1) {
        addToast('success', `Anexo "${successfulUploads[0]}" enviado com sucesso`)
      } else {
        addToast('success', `${successfulUploads.length} anexo(s) enviado(s) com sucesso`)
      }
    }

    if (failedUploads.length > 0) {
      addToast('error', `Falha no upload: ${failedUploads.join(', ')}`)
    }

    await loadAttachments()
    setUploading(false)
    setUploadProgress(null)
  }

  const handleDelete = async (attachmentId: number, filename: string) => {
    if (!confirm(`Tem certeza que deseja excluir o anexo "${filename}"?`)) return

    try {
      const res = await fetch(`/api/v1/library/${libraryId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errormsg || 'Erro ao excluir anexo')
      }

      addToast('success', `Anexo "${filename}" excluído com sucesso`)
      await loadAttachments()
    } catch (err: any) {
      addToast('error', err.message)
    }
  }

  const handleDownload = (attachmentId: number, filename: string) => {
    window.open(`/api/v1/library/${libraryId}/attachments/${attachmentId}`, '_blank')
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleUpload(e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="library-attachments">
      <h5 className="mb-3">Anexos</h5>

      <ToastContainer position="bottom-end" className="p-3" style={{ position: 'fixed', zIndex: 9999 }} role="status" aria-live="polite">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            onClose={() => removeToast(toast.id)}
            bg={toast.type === 'success' ? 'success' : toast.type === 'error' ? 'danger' : 'warning'}
            autohide
            delay={5000}
          >
            <Toast.Header>
              <strong className="me-auto">
                {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Erro' : 'Aviso'}
              </strong>
            </Toast.Header>
            <Toast.Body className="text-white">{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      <div
        className="alert alert-secondary mb-3 p-2 text-center"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Enviar PDFs: arraste arquivos ou pressione Enter para selecionar"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!uploading) document.getElementById('attachment-file-input')?.click()
          }
        }}
        style={{
          border: '3px dashed #777',
          cursor: uploading ? 'wait' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isDragging ? '#e7f1ff' : 'transparent',
          transition: 'all 0.2s',
        }}
        onClick={() => !uploading && document.getElementById('attachment-file-input')?.click()}
      >
        <input
          id="attachment-file-input"
          type="file"
          accept="application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            {uploadProgress && (
              <span>
                Enviando arquivo {uploadProgress.current} de {uploadProgress.total}...
              </span>
            )}
            {!uploadProgress && <span>Processando...</span>}
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faUpload} className="me-2" size="lg" />
            <div>Arraste PDFs aqui ou clique para selecionar</div>
            <small className="text-muted">Máximo 10 anexos, 1MB por arquivo, múltiplos arquivos permitidos</small>
          </>
        )}
      </div>

      {loading && !initialized ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-muted text-center p-3">Nenhum anexo adicionado</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <caption className="visually-hidden">Anexos</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: '40%' }}>Nome do Arquivo</th>
                <th scope="col" style={{ width: '15%' }} className="text-end">Tamanho</th>
                <th scope="col" style={{ width: '15%' }} className="text-end">Palavras</th>
                <th scope="col" style={{ width: '15%' }} className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((att) => (
                <tr key={att.id}>
                  <td>
                    <FontAwesomeIcon icon={faFilePdf} className="me-2 text-danger" />
                    <button
                      type="button"
                      className="btn btn-link p-0 text-primary"
                      onClick={() => handleDownload(att.id, att.filename)}
                    >
                      {att.filename}
                    </button>
                  </td>
                  <td className="text-end">{formatFileSize(att.file_size)}</td>
                  <td className="text-end">{formatNumber(att.word_count)}</td>
                  <td className="text-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleDownload(att.id, att.filename)}
                      title="Baixar"
                      aria-label={`Baixar ${att.filename}`}
                    >
                      <FontAwesomeIcon icon={faDownload} />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(att.id, att.filename)}
                      title="Excluir"
                      aria-label={`Excluir ${att.filename}`}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
