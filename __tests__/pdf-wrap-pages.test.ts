import { wrapPages } from '@/lib/pdf/wrap-pages'

describe('wrapPages', () => {
    it('retorna string vazia para entrada vazia', () => {
        expect(wrapPages('')).toBe('')
    })

    it('envolve uma única página (sem form-feed)', () => {
        const out = wrapPages('Conteúdo da página única')
        expect(out).toBe('<page number="1">\nConteúdo da página única\n</page>')
    })

    it('divide páginas pelo form-feed e numera sequencialmente', () => {
        const raw = 'Página um\fPágina dois\fPágina três'
        const out = wrapPages(raw)
        expect(out).toBe(
            '<page number="1">\nPágina um\n</page>\n' +
                '<page number="2">\nPágina dois\n</page>\n' +
                '<page number="3">\nPágina três\n</page>'
        )
    })

    it('descarta apenas o elemento vazio trailing (form-feed final do pdftotext)', () => {
        // pdftotext emite \f ao final de cada página, inclusive a última
        const raw = 'Página um\fPágina dois\f'
        const out = wrapPages(raw)
        expect(out).toBe('<page number="1">\nPágina um\n</page>\n<page number="2">\nPágina dois\n</page>')
    })

    it('preserva o número real da página mesmo quando há páginas vazias no meio (PDFs mistos)', () => {
        // Ex.: capa scaneada (sem texto) nas páginas 1-4, texto digital a partir da 5.
        // Filtrar páginas do meio deslocaria a numeração; preservar garante tooltip "Pág: 5".
        // 4 form-feeds => 5 páginas (4 vazias + 1 com texto); o texto cai na nº 5.
        const raw = '\f\f\f\fTexto da página cinco'
        const out = wrapPages(raw)
        expect(out).toContain('<page number="5">\nTexto da página cinco\n</page>')
        expect(out).toContain('<page number="1">\n\n</page>')
    })

    it('normaliza quebras de linha leading/trailing de cada página', () => {
        const raw = '\n\nTexto\n\n\f\n\nMais texto\n\n'
        const out = wrapPages(raw)
        expect(out).toBe('<page number="1">\nTexto\n</page>\n<page number="2">\nMais texto\n</page>')
    })

    it('converte CRLF (\\r\\n) para LF', () => {
        const raw = 'Linha um\r\nLinha dois\r\nLinha três'
        const out = wrapPages(raw)
        expect(out).toBe('<page number="1">\nLinha um\nLinha dois\nLinha três\n</page>')
    })

    it('converte CR isolado (\\r) para LF', () => {
        const raw = 'Linha um\rLinha dois\r'
        const out = wrapPages(raw)
        expect(out).toBe('<page number="1">\nLinha um\nLinha dois\n</page>')
    })

    it('colapsa 2+ LF consecutivos em um único LF (remove linhas em branco excessivas)', () => {
        const raw = 'Parágrafo um\n\n\n\n\nParágrafo dois\n\n\nParágrafo três'
        const out = wrapPages(raw)
        expect(out).toBe(
            '<page number="1">\nParágrafo um\nParágrafo dois\nParágrafo três\n</page>'
        )
    })

    it('normalização não interfere na separação de páginas por form-feed', () => {
        // Mistura CRLF, runs de LF e form-feed: a contagem de páginas deve se manter.
        const raw = 'Pág1 linha1\r\n\r\nPág1 linha2\f\fPág3\r\nfim'
        const out = wrapPages(raw)
        expect(out).toBe(
            '<page number="1">\nPág1 linha1\nPág1 linha2\n</page>\n' +
                '<page number="2">\n\n</page>\n' +
                '<page number="3">\nPág3\nfim\n</page>'
        )
    })

    it('colapsa runs de LF imediatamente após CRLF (mistura \\n\\r\\n e \\r\\n\\r\\n)', () => {
        // Cobre a interação entre normalização CRLF e colapso de LF: nenhum \n extra.
        const raw = 'A\n\r\nB\r\n\r\nC'
        const out = wrapPages(raw)
        expect(out).toBe('<page number="1">\nA\nB\nC\n</page>')
    })

    it('lida com CR isolado no meio de runs de LF (\\r\\n\\n -> um \\n)', () => {
        const raw = 'X\r\n\nY'
        const out = wrapPages(raw)
        expect(out).toBe('<page number="1">\nX\nY\n</page>')
    })

    it('não colapsa form-feed com LF: \\\\n\\\\f\\\\n vira quebra de página, não LF', () => {
        const raw = 'P1\n\f\nP2'
        const out = wrapPages(raw)
        expect(out).toBe('<page number="1">\nP1\n</page>\n<page number="2">\nP2\n</page>')
    })

    it('compatível com obterPaginasECaracteres: split em </page> reconstrói as páginas', () => {
        // Espelha a lógica de lib/proc/piece.ts:obterPaginasECaracteres
        const raw = 'Alpha\fBeta\fGama\f'
        const wrapped = wrapPages(raw)
        const pages = wrapped.replace(/<page number="\d+">\n/, '').split('</page>')
        pages.pop()
        expect(pages).toHaveLength(3)
        // chars é a soma dos tamanhos (inclui \n do join e qualquer <page> residual)
        const chars = pages.reduce((acc, p) => acc + p.length, 0)
        expect(chars).toBeGreaterThan(0)
    })
})
