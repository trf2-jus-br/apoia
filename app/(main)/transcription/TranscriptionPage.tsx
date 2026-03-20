'use client'

import { useState, useRef, useEffect } from 'react'
import AiContent from '@/components/ai-content'
import AudioConversionProgress from '@/components/audio-conversion-progress'
import { Button, Alert } from 'react-bootstrap'
import { getInternalPrompt } from '@/lib/ai/prompt'
import { FileTypeEnum } from '@/lib/ai/model-types'
import { checkModelSupportsAudioVideoSync } from '@/lib/ai/model-validation'
import {
    extractAudioToMp3,
    AudioExtractionProgress as AudioExtractionProgressType,
    AudioExtractionResult
} from '@/lib/audio/audio-extractor'
import { slugify } from '@/lib/utils/utils'
import Print from '@/components/slots/print'
import { formatBytes, formatDuration } from '@/lib/audio/audio-utils'
import Chat from '@/components/slots/chat'
import { AiModelSelect } from '@/components/AiModelSelect'

// Formatos de áudio e vídeo suportados
const SUPPORTED_AUDIO_VIDEO_TYPES = [
    FileTypeEnum.MP3,
    FileTypeEnum.MP4,
    FileTypeEnum.WMA,
    FileTypeEnum.WMV,
    FileTypeEnum.WAV,
    FileTypeEnum.AIFF,
    FileTypeEnum.AAC,
    FileTypeEnum.OGG,
    FileTypeEnum.FLAC,
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Cache de conversões de áudio/vídeo para MP3 16kHz mono
const audioConversionCache = new Map<string, AudioExtractionResult>()

export default function TranscriptionPage({ model }: { model: string }) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)
    const [hidden, setHidden] = useState(true)
    const [modelSupportsFiles, setModelSupportsFiles] = useState<boolean>(true)

    // Estados para conversão de áudio
    const [isConverting, setIsConverting] = useState(false)
    const [conversionProgress, setConversionProgress] = useState<AudioExtractionProgressType | null>(null)
    const [conversionResult, setConversionResult] = useState<AudioExtractionResult | null>(null)
    const [contentRaw, setContentRaw] = useState<string>('')

    const abortControllerRef = useRef<AbortController | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const convertFileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            setSelectedFile(null)
            setFileDataUrl(null)
            setFileError(null)
            setIsConverting(false)
            setConversionProgress(null)
            setConversionResult(null)
            return
        }

        // Validar tipo de arquivo
        if (!SUPPORTED_AUDIO_VIDEO_TYPES.includes(file.type as FileTypeEnum)) {
            setFileError(`Tipo de arquivo não suportado: ${file.type}. Formatos aceitos: MP3, MP4, WAV, WMA, WMV, AIFF, AAC, OGG, FLAC`)
            setSelectedFile(null)
            setFileDataUrl(null)
            setIsConverting(false)
            setConversionProgress(null)
            setConversionResult(null)
            return
        }

        // Validar tamanho do arquivo
        if (file.size > MAX_FILE_SIZE) {
            setFileError(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo permitido: 100MB`)
            setSelectedFile(null)
            setFileDataUrl(null)
            setIsConverting(false)
            setConversionProgress(null)
            setConversionResult(null)
            return
        }

        try {
            setFileError(null)
            setSelectedFile(file)
            setHidden(true)

            // Verificar cache (funciona para vídeos e áudios)
            const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
            const cachedResult = audioConversionCache.get(cacheKey)

            if (cachedResult) {
                // Usar resultado do cache
                setConversionResult(cachedResult)
                setFileDataUrl(cachedResult.mp3DataUrl)
                setConversionProgress({
                    stage: 'complete',
                    progress: 100,
                    message: 'Conversao concluida (cache)'
                })
            } else {
                // Converter qualquer arquivo (vídeo ou áudio) para MP3 16kHz mono
                setIsConverting(true)
                setConversionProgress({
                    stage: 'loading',
                    progress: 0,
                    message: 'Iniciando conversao...'
                })

                abortControllerRef.current = new AbortController()

                const result = await extractAudioToMp3(
                    file,
                    (progress) => setConversionProgress(progress),
                    abortControllerRef.current.signal
                )

                // Salvar no cache
                audioConversionCache.set(cacheKey, result)

                setConversionResult(result)
                setFileDataUrl(result.mp3DataUrl)
                setIsConverting(false)
            }
        } catch (error) {
            // Se foi cancelamento pelo usuário, apenas limpar sem mostrar erro
            if (error instanceof Error && error.message === 'Operação cancelada') {
                setSelectedFile(null)
                setFileDataUrl(null)
                setIsConverting(false)
                setConversionProgress(null)
                setConversionResult(null)

                // Limpar o input para permitir selecionar o mesmo arquivo novamente
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }

                // Não setar fileError para cancelamento
                return
            }

            // Para outros erros, mostrar mensagem
            let errorMessage = 'Erro ao processar o arquivo. Tente novamente.'

            if (error instanceof Error) {
                // Usar mensagem específica do erro
                errorMessage = error.message

                // Log detalhado no console para debugging
                console.error('Erro ao processar arquivo:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    file: file?.name,
                    type: file?.type,
                    size: file?.size
                })
            }

            setFileError(errorMessage)
            setSelectedFile(null)
            setFileDataUrl(null)
            setIsConverting(false)
            setConversionProgress(null)
            setConversionResult(null)
        }
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file && fileInputRef.current) {
            // Simular a seleção do arquivo
            const dt = new DataTransfer()
            dt.items.add(file)
            fileInputRef.current.files = dt.files
            handleFileSelect({ target: { files: dt.files } } as any)
        }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    const handleCancelConversion = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setIsConverting(false)
        setConversionProgress(null)
        setConversionResult(null)
        setSelectedFile(null)
        setFileDataUrl(null)

        // Limpar o input para permitir selecionar o mesmo arquivo novamente
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Verificar se o modelo selecionado suporta áudio/vídeo
    useEffect(() => {
        if (model) {
            const supportsFiles = checkModelSupportsAudioVideoSync(model)
            setModelSupportsFiles(supportsFiles)
        } else {
            setModelSupportsFiles(false)
        }
    }, [model])

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div id="printDiv">
            <div className='d-flex flex-column justify-content-between mt-3 flex-md-row'>
                <h2>Degravação de Áudio/Vídeo</h2>
                <AiModelSelect />
            </div>

            {/* Verificação de suporte do modelo */}
            {model && !modelSupportsFiles && (
                <Alert variant="warning" className="mb-3">
                    <strong>Modelo não suporta áudio/vídeo</strong><br />
                    O modelo selecionado ({model}) não suporta transcrição de áudio/vídeo.
                    Por favor, configure uma chave de API para um modelo Gemini para utilizar esta funcionalidade.
                </Alert>
            )}

            {!model && (
                <Alert variant="warning" className="mb-3">
                    <strong>Configuração de modelo necessária</strong><br />
                    Por favor, configure uma chave de API válida para utilizar esta funcionalidade.
                </Alert>
            )}

            {/* Área de upload */}
            <div
                className="alert alert-secondary mt-3 mb-1 p-4 text-center h-print"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                    border: '3px dashed #777',
                    cursor: 'pointer',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.mp4,.wav,.wma,.wmv,.aiff,.aac,.ogg,.flac"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {selectedFile ? (
                    <div>
                        <div className="mb-2">
                            <strong>📁 {selectedFile.name}</strong>
                        </div>
                        <div className="text-muted">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type}
                        </div>
                        <Button variant="outline-secondary" size="sm" className="mt-2 h-print">
                            Trocar Arquivo
                        </Button>
                    </div>
                ) : (
                    <div>
                        <div className="mb-2">
                            <strong>Selecione um arquivo de áudio ou vídeo</strong>
                        </div>
                        <div className="text-muted mb-2">
                            Arraste e solte ou clique para selecionar
                        </div>
                        <div className="text-muted small">
                            Formatos: MP3, MP4, WAV, WMA, WMV, AIFF, AAC, OGG, FLAC<br />
                            Tamanho máximo: 100MB
                        </div>
                    </div>
                )}
            </div>

            {/* Erro de arquivo */}
            {fileError && (
                <Alert variant="danger" className="mb-3">
                    <strong>Erro no arquivo:</strong> {fileError}
                </Alert>
            )}

            {/* Progress bar de conversão de vídeo */}
            {selectedFile && conversionProgress && (
                <AudioConversionProgress
                    originalFileName={selectedFile.name}
                    progress={conversionProgress}
                    result={conversionResult}
                    onCancel={handleCancelConversion}
                />
            )}
            {selectedFile && conversionResult && (
                <div className="d-none d-print-block">
                    <table className="table table-sm mb-0">
                        <tbody>
                            <tr>
                                <th scope="row" style={{ width: '1%', textAlign: 'center' }}>Arquivo</th>
                                <th style={{ width: '1%', textAlign: 'center' }}>Duração</th>
                                <th style={{ width: '1%', textAlign: 'center' }}>Tamanho Original</th>
                                <th style={{ width: '1%', textAlign: 'center' }}>Tamanho Otimizado</th>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>{selectedFile.name}</td>
                                <td style={{ textAlign: 'center' }}>{formatDuration(conversionResult.durationSeconds)}</td>
                                <td style={{ textAlign: 'center' }}>{formatBytes(selectedFile.size)}</td>
                                <td style={{ textAlign: 'center' }}>{formatBytes(conversionResult.sizeBytes)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div >
            )}

            {/* Botão de transcrever */}
            {
                hidden && (
                    <>
                        <div className="text-body-tertiary mb-3">
                            Selecione um arquivo de áudio ou vídeo acima e clique em &quot;Transcrever&quot; para gerar a transcrição com timestamps e sumário.
                        </div>

                        {selectedFile && fileError && (
                            <Alert variant="danger" className="mb-3">
                                <strong>Erro no arquivo</strong><br />
                                {fileError}
                            </Alert>
                        )}

                        {selectedFile && !fileError && !model && (
                            <Alert variant="warning" className="mb-3">
                                <strong>Modelo necessário</strong><br />
                                Por favor, configure uma chave de API válida para um modelo de IA.
                            </Alert>
                        )}

                        {selectedFile && !fileError && model && !modelSupportsFiles && (
                            <Alert variant="warning" className="mb-3">
                                <strong>Modelo incompatível</strong><br />
                                O modelo selecionado ({model}) não suporta transcrição de áudio/vídeo.<br />
                                Por favor, configure uma chave de API para um modelo Gemini (2.5 Flash, 2.5 Pro, etc.).
                            </Alert>
                        )}

                        <Button
                            disabled={!selectedFile || !!fileError || !modelSupportsFiles || isConverting || !fileDataUrl}
                            className="mt-2"
                            onClick={() => setHidden(false)}
                        >
                            Transcrever
                        </Button>
                    </>
                )
            }

            {/* Resultado da transcrição */}
            {
                !hidden && selectedFile && fileDataUrl && !fileError && modelSupportsFiles && (
                    <>
                        <h2 className="mt-3">Transcrição</h2>
                        <AiContent
                            definition={getInternalPrompt('degravacao')}
                            data={{
                                textos: [{
                                    numeroDoProcesso: '',
                                    descr: conversionResult
                                        ? `Áudio extraído de: ${selectedFile.name} (convertido para MP3 16kHz mono)`
                                        : `Arquivo de áudio: ${selectedFile.name}`,
                                    slug: 'arquivo',
                                    texto: fileDataUrl, // Data URL do arquivo (MP3 se foi vídeo)
                                    sigilo: '0'
                                }]
                            }}
                            dossierCode={undefined}
                            onReady={(content) => setContentRaw(content.raw)}
                        />
                    </>
                )
            }

            {contentRaw && (<>
                <Chat
                    definition={getInternalPrompt('chat')}
                    model={model}
                    data={{
                        textos: [{
                            numeroDoProcesso: '',
                            descr: conversionResult
                                ? `Áudio extraído de: ${selectedFile.name} (convertido para MP3 16kHz mono)`
                                : `Arquivo de áudio: ${selectedFile.name}`,
                            slug: 'arquivo',
                            texto: contentRaw, // Data URL do arquivo (MP3 se foi vídeo)
                            sigilo: '0'
                        }]
                    }}
                />
                <Print numeroDoProcesso={slugify(prompt.name)} />
            </>)}
        </div >
    )
}