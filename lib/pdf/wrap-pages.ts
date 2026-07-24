/**
 * Converte a saída do pdftotext (separada por form-feed `\f` entre páginas) no
 * formato de marcadores `<page number="N">...</page>` esperado pelos consumidores
 * (n-grams tokenizer → tooltip "Pág: N"; obterPaginasECaracteres em piece.ts;
 * EditorComponent.tsx). Mantém compatibilidade com a saída do pdf-parse antigo.
 *
 * Isolado num módulo próprio (sem imports de p-limit/child_process) para permitir
 * teste unitário direto sem depender da infraestrutura de subprocess do Jest.
 *
 * Implementação single-pass O(n), SEM regex na hot path: um único percurso
 * normaliza CR/CRLF -> LF, colapsa runs de `\n` em um só e detecta o `\f` como
 * separador de página. Motivo: versões anteriores deste arquivo usavam regexes
 * de normalização que, embora lineares, faziam múltiplas passagens sobre o texto
 * (comentário histórico: "consomem quantidades gigantescas de CPU em PDFs
 * grandes"); aqui evitamos regex e alocamos o mínimo (buffer por caractere via
 * array + join, não string += que seria O(n^2)).
 *
 * O pdftotext emite `\f` (0x0C) ao final de cada página, inclusive a última,
 * gerando uma página vazia trailing — descartada abaixo.
 *
 * IMPORTANTE: não filtramos páginas vazias no meio. Em PDFs mistos (ex.: capa
 * scaneada nas páginas 1-4, texto digital da 5 em diante), preservar o índice
 * real garante que o tooltip de citação mostre o número de página correto.
 */
export function wrapPages(text: string): string {
    if (text.length === 0) return ''

    // Percurso único O(n). Variáveis de estado:
    // - pages: acumula o corpo (já normalizado) de cada página.
    // - buf:   acumula os caracteres da página corrente.
    // - startedContent: false no início da página -> descarta `\n` leading (trim).
    // - prevNL: houve `\n` como último emitido -> colapsa `\n` repetidos.
    const pages: string[] = []
    const buf: string[] = []
    let startedContent = false
    let prevNL = false

    const flush = () => {
        // trim trailing: descarta `\n` no fim do buffer antes de fechar a página
        while (buf.length > 0 && buf[buf.length - 1] === '\n') buf.pop()
        pages.push(buf.join(''))
        buf.length = 0
        startedContent = false
        prevNL = false
    }

    for (let i = 0; i < text.length; i++) {
        const c = text[i]

        if (c === '\f') {
            // Form-feed: separa páginas. (Não emitimos `\n` aqui.)
            flush()
            continue
        }

        if (c === '\n' || c === '\r') {
            // CRLF -> LF: se for `\r` seguido de `\n`, consome os dois como UM `\n`.
            if (c === '\r' && text[i + 1] === '\n') i++
            // Trim de leading: `\n` antes de qualquer conteúdo da página é descartado.
            if (!startedContent) continue
            // Colapso: emite no máximo um `\n` por run.
            if (!prevNL) {
                buf.push('\n')
                prevNL = true
            }
            continue
        }

        // Caractere comum: emite e reinicia o estado de colapso.
        buf.push(c)
        startedContent = true
        prevNL = false
    }
    flush()

    // Descarta apenas a página vazia final (artefato do `\f` terminal do pdftotext).
    if (pages.length > 0 && pages[pages.length - 1].trim() === '') pages.pop()
    if (pages.length === 0) return ''

    return pages.map((body, i) => `<page number="${i + 1}">\n${body}\n</page>`).join('\n')
}
