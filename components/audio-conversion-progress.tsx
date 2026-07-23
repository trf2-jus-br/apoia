'use client'

import { Alert, ProgressBar, Button, Row, Col } from 'react-bootstrap'
import { AudioExtractionProgress, AudioExtractionResult } from '@/lib/audio/audio-extractor'
import { formatBytes, createMp3FileName, formatDuration } from '@/lib/audio/audio-utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'

interface AudioConversionProgressProps {
    originalFileName: string
    progress: AudioExtractionProgress
    result: AudioExtractionResult | null
    onCancel: () => void
}

export default function AudioConversionProgress({
    originalFileName,
    progress,
    result,
    onCancel,
}: AudioConversionProgressProps) {
    const getVariant = () => {
        switch (progress.stage) {
            case 'error':
                return 'danger'
            case 'complete':
                return 'success'
            default:
                return 'primary'
        }
    }

    const getStageLabel = () => {
        switch (progress.stage) {
            case 'loading':
                return 'Carregando arquivo'
            case 'decoding':
                return 'Decodificando audio'
            case 'resampling':
                return 'Convertendo para mono 16kHz'
            case 'encoding':
                return 'Gerando MP3'
            case 'complete':
                return 'Conversao concluida'
            case 'error':
                return 'Erro na conversao'
            default:
                return 'Processando'
        }
    }

    const handleDownload = () => {
        if (!result) return

        const url = URL.createObjectURL(result.mp3Blob)
        const link = document.createElement('a')
        link.href = url
        link.download = createMp3FileName(originalFileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <Alert variant="dark" className="mt-3 mb-1 h-print">

            <div style={{
                animation: progress.progress >= 99 ? 'fadeOutCollapse 0.5s ease-out forwards' : 'fadeIn 0.5s ease-in',
                overflow: 'hidden',
            }}>
                <div className="mb-2 text-center">
                    <strong>Convertendo para MP3 otimizado (16kHz, mono, 64kbps)</strong>
                </div>
                <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1" role="status" aria-live="polite">
                        <small className="text-muted">{getStageLabel()}</small>
                        <small className="text-muted">{Math.round(progress.progress)}%</small>
                    </div>
                    <ProgressBar
                        now={progress.progress}
                        variant={getVariant()}
                        animated={progress.stage !== 'complete' && progress.stage !== 'error'}
                        striped={progress.stage !== 'complete' && progress.stage !== 'error'}
                    />
                </div>
                {progress.stage !== 'error' && (
                    <div className="mt-3 text-center">
                        <Button variant="outline-danger" size="sm" onClick={onCancel}>Cancelar</Button>
                    </div>
                )}
            </div>

            {progress.stage === 'error' && (
                <Alert variant="danger" className="mt-2 mb-2">
                    <strong>Erro:</strong> {progress.message}
                </Alert>
            )}

            {result && progress.stage === 'complete' && (
                <Row style={{ animation: 'fadeIn 0.5s ease-in' }}>
                    <Col xs="auto">
                        <div>
                            <div className="">
                                Duração: {formatDuration(result.durationSeconds)} |
                                Tamanho: {formatBytes(result.sizeBytes)}
                            </div>
                            {result.sizeBytes > 20 * 1024 * 1024 && (
                                <div className="small text-warning mt-1">
                                    Arquivo maior que 20MB - pode haver limitações no envio
                                </div>
                            )}
                        </div>
                    </Col>
                    <Col xs="auto" className="ms-auto h-print">
                        <button type="button" className="btn btn-link p-0 link-primary" onClick={handleDownload} aria-label="Baixar MP3">
                            <FontAwesomeIcon icon={faDownload} />
                        </button>
                    </Col>
                </Row>
            )}
        </Alert>
    )
}
