import pdf from 'pdf-parse'
import pLimit from 'p-limit'

// Semáforo que limita quantos parseamentos de PDF rodam simultaneamente.
// O pdf-parse/pdfjs é CPU-bound e bloqueia o event loop; sem limite, uma rajada
// de GETs /piece/.../content empilha dezenas de parseamentos e trava o servidor.
// Default 1: conservador para um core de CPU. Ajustável via env PDF_PARSE_LIMIT.
const limit = pLimit(process.env.PDF_PARSE_LIMIT ? parseInt(process.env.PDF_PARSE_LIMIT) : 1)

// Tamanho máximo de PDF que será processado. Acima disso, rejeita para evitar
// travar o servidor com parsing de PDFs gigantes (uma peça de 30MB pode consumir
// CPU por vários segundos e prejudicar todos os outros requests).
// Consistente com o limite já usado no caminho de chat (generate.ts).
const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10MB

function render_page(pageData) {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: true,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }

    return pageData.getTextContent(render_options)
        .then(function (textContent) {
            // Acumula os pedaços num array e concatena só no final com join.
            // String += em loop é O(n^2) (strings sao imutaveis em JS) e gera
            // O(n) strings temporarias que sobrecarregam o GC sob concorrencia.
            let lastY
            const parts = [`<page number="${pageData.pageIndex + 1}">\n`]
            for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY) {
                    parts.push(item.str)
                }
                else {
                    parts.push('\n', item.str)
                }
                lastY = item.transform[5]
            }
            parts.push('\n</page>')
            return parts.join('')
        })
}

/** Suppress noisy pdf.js Info/Warning/Deprecated logs during PDF parsing */
async function silentPdf(blob: ArrayBuffer, options: object) {
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : ''
        if (msg.startsWith('Info:') || msg.startsWith('Warning:') || msg.startsWith('Deprecated API usage:')) return
        originalLog.apply(console, args)
    }
    try {
        return await pdf(blob, options)
    } finally {
        console.log = originalLog
    }
}

export async function pdfToText(blob: ArrayBuffer, options): Promise<string> {
    // Validação de tamanho antes de entrar no semáforo: não faz sentido ocupar
    // slot da fila para depois rejeitar. Rejeita cedo para não alocar/carregar.
    if (blob.byteLength > MAX_PDF_BYTES) {
        // logEvent('pdfToText:rejected', {
        //     size_mb: Math.round((blob.byteLength / 1024 / 1024) * 100) / 100,
        // })
        throw new Error(`PDF muito grande para processamento (${(blob.byteLength / 1024 / 1024).toFixed(1)}MB). O limite é ${(MAX_PDF_BYTES / 1024 / 1024).toFixed(0)}MB.`)
    }
    const start = Date.now()
    return limit(async () => {
        try {
            const data = await silentPdf(blob, { pagerender: render_page })
            const text = data.text

            // As expressões regulares abaixo eram usadas para normalizar a saída do pdf-parse, mas
            // elas consomem quantidades gigantescas de CPU em PDFs grandes (O(n^2) com regexes). 
            // Comentadas para evitar travamentos.
            // .replace(/\n\n\<page number/gm, '<page number')
            // .replace(/\<\/page\><page/gm, '</page>\n<page')
            // .replace(/\s+\<\/page\>/gm, '\n</page>')
            // .replace(/\<page number="(\d+)"\>\s+/gm, '<page number="$1">\n')

            // logEvent('pdfToText:done', {
            //     size_mb: Math.round((blob.byteLength / 1024 / 1024) * 100) / 100,
            //     duration_ms: Date.now() - start,
            //     text_chars: text.length,
            // })
            return text
        } catch (err: any) {
            // logEvent('pdfToText:error', {
            //     size_mb: Math.round((blob.byteLength / 1024 / 1024) * 100) / 100,
            //     duration_ms: Date.now() - start,
            //     error: (err?.message || String(err)).slice(0, 200),
            // })
            throw err
        }
    })
}
