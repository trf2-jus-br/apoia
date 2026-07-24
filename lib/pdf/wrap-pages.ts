/**
 * Converte a saída do pdftotext (separada por form-feed `\f` entre páginas) no
 * formato de marcadores `<page number="N">...</page>` esperado pelos consumidores
 * (n-grams tokenizer → tooltip "Pág: N"; obterPaginasECaracteres em piece.ts;
 * EditorComponent.tsx). Mantém compatibilidade com a saída do pdf-parse antigo.
 *
 * Isolado num módulo próprio (sem imports de p-limit/child_process) para permitir
 * teste unitário direto sem depender da infraestrutura de subprocess do Jest.
 *
 * Normalização de quebras de linha (aplicada antes do split por `\f`):
 * - CRLF (`\r\n`) e CR isolado (`\r`, fim-de-linha Mac antigo) viram `\n`;
 * - runs de 2+ `\n` consecutivos colapsam para um único `\n`, removendo as
 *   linhas em branco excessivas que o pdftotext gera a partir do espaçamento
 *   visual do PDF. Como o form-feed `\f` é um caractere distinto de `\n`,
 *   essa normalização não afeta a contagem/separação de páginas.
 *
 * O pdftotext emite `\f` (0x0C) ao final de cada página, inclusive a última,
 * gerando um elemento vazio trailing no split — descartamos apenas esse.
 *
 * IMPORTANTE: não filtramos páginas vazias no meio. Em PDFs mistos (ex.: capa
 * scaneada nas páginas 1-4, texto digital da 5 em diante), preservar o índice
 * real garante que o tooltip de citação mostre o número de página correto.
 */
export function wrapPages(text: string): string {
    const normalized = text
        .replace(/\r\n/g, '\n') // CRLF -> LF
        .replace(/\r/g, '\n') // CR isolado -> LF
        .replace(/\n{2,}/g, '\n') // 2+ LF consecutivos -> 1 LF
    const rawPages = normalized.split('\f')
    if (rawPages.length > 0 && rawPages[rawPages.length - 1].trim() === '') {
        rawPages.pop()
    }
    if (rawPages.length === 0) return ''
    return rawPages
        .map((page, i) => {
            const body = page.replace(/^\n+/, '').replace(/\n+$/, '')
            return `<page number="${i + 1}">\n${body}\n</page>`
        })
        .join('\n')
}
