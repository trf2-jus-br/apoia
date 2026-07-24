import { spawn } from 'child_process'
import pLimit from 'p-limit'
import devLog from '../utils/log'
import { wrapPages } from './wrap-pages'

// Semáforo que limita quantos parseamentos de PDF rodam simultaneamente.
// Embora o pdftotext rode num subprocesso (fora do event loop do Node), ele
// ainda consome CPU. Sem limite, uma rajada de GETs /piece/.../content empilha
// dezenas de processos e satura o(s) core(s). Default 1: conservador.
// Ajustável via env PDF_PARSE_LIMIT.
const limit = pLimit(process.env.PDF_PARSE_LIMIT ? parseInt(process.env.PDF_PARSE_LIMIT) : 1)

// Tamanho máximo de PDF que será processado. Acima disso, rejeita para evitar
// travar o servidor com parsing de PDFs gigantes (uma peça de 30MB pode consumir
// CPU por vários segundos e prejudicar todos os outros requests).
// Consistente com o limite já usado no caminho de chat (generate.ts).
const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10MB

// Timeout de segurança para o subprocesso pdftotext. PDFs malformados podem
// fazê-lo demorar indefinidamente; matamos após esse janela para liberar o slot.
const PDFTOTEXT_TIMEOUT_MS = process.env.PDFTOTEXT_TIMEOUT_MS ? parseInt(process.env.PDFTOTEXT_TIMEOUT_MS) : 120000

/**
 * Executa o binário nativo `pdftotext` (Poppler) num subprocesso, alimentando
 * o PDF via stdin e lendo o texto via stdout. Roda FORA do event loop do Node,
 * eliminando o bloqueio que o pdf-parse/pdfjs (in-process, worker desabilitado)
 * causava. Requer `pdftotext` no PATH (produção: apt-get install poppler-utils
 * no Docker; dev Windows: scoop/choco install poppler).
 */
function runPdftotext(buffer: ArrayBuffer): Promise<string> {
    devLog('Extraindo texto de PDF')
    return new Promise((resolve, reject) => {
        // `-enc UTF-8`: força saída em UTF-8 (independe do locale do container).
        // `- -`: lê o PDF do stdin (`-`) e escreve o texto no stdout (`-`).
        const child = spawn('pdftotext', ['-enc', 'UTF-8', '-', '-'], {
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        const stdoutChunks: Buffer[] = []
        let stderrText = ''

        child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
        child.stderr.on('data', (chunk: Buffer) => {
            stderrText += chunk.toString('utf8')
        })

        let settled = false
        const timer = setTimeout(() => {
            if (settled) return
            settled = true
            child.kill('SIGKILL')
            reject(new Error(`pdftotext excedeu o tempo limite de ${PDFTOTEXT_TIMEOUT_MS / 1000}s.`))
        }, PDFTOTEXT_TIMEOUT_MS)

        child.on('error', (err: NodeJS.ErrnoException) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            if (err.code === 'ENOENT') {
                reject(
                    new Error(
                        "Binário 'pdftotext' não encontrado no PATH. Instale o Poppler (produção: poppler-utils via apt-get; Windows: 'scoop install poppler' ou 'choco install poppler')."
                    )
                )
            } else {
                reject(err)
            }
        })

        child.on('close', (code) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            if (code !== 0) {
                reject(
                    new Error(
                        `pdftotext falhou (exit code ${code})${stderrText ? `: ${stderrText.trim().slice(0, 500)}` : ''}`
                    )
                )
                return
            }
            // Warnings não-fatais (ex.: fontes ausentes) chegam no stderr mesmo com code 0.
            if (stderrText.trim()) {
                devLog('pdftotext warning:', stderrText.trim().slice(0, 500))
            }
            resolve(Buffer.concat(stdoutChunks).toString('utf8'))
        })

        // Escreve o PDF no stdin e fecha para o pdftotext começar a processar.
        child.stdin.on('error', (err) => {
            // EPIPE acontece se o processo morreu antes de ler tudo; o 'close'/'error'
            // já vão rejeitar. Apenas logamos para não ter unhandled.
            if (!settled) devLog('pdftotext stdin error:', err.message)
        })
        child.stdin.end(Buffer.from(buffer))
    })
}

export async function pdfToText(blob: ArrayBuffer, options): Promise<string> {
    // Validação de tamanho antes de entrar no semáforo: não faz sentido ocupar
    // slot da fila para depois rejeitar. Rejeita cedo para não alocar/carregar.
    if (blob.byteLength > MAX_PDF_BYTES) {
        throw new Error(`PDF muito grande para processamento (${(blob.byteLength / 1024 / 1024).toFixed(1)}MB). O limite é ${(MAX_PDF_BYTES / 1024 / 1024).toFixed(0)}MB.`)
    }
    const start = Date.now()
    return limit(async () => {
        try {
            const rawText = await runPdftotext(blob)
            const text = wrapPages(rawText)
            devLog(
                `pdfToText:done size_mb=${(blob.byteLength / 1024 / 1024).toFixed(2)} duration_ms=${Date.now() - start} text_chars=${text.length}`
            )
            return text
        } catch (err: any) {
            devLog(
                `pdfToText:error size_mb=${(blob.byteLength / 1024 / 1024).toFixed(2)} duration_ms=${Date.now() - start} error=${(err?.message || String(err)).slice(0, 200)}`
            )
            throw err
        }
    })
}
