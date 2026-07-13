// file-type v22 é ESM-only; o Jest deste projeto roda em modo CJS (ts-jest).
// Por isso mockamos file-type. O que se testa aqui é a lógica de precedência do
// resolverContentType (tipo reportado > detecção por bytes > fallback), não a
// detecção de magic numbers em si — essa é responsabilidade do file-type.
jest.mock('file-type', () => ({
    fileTypeFromBuffer: jest.fn(),
}))

import { resolverContentType } from '@/lib/proc/content-type'

type FileTypeFromBuffer = (
    buffer: ArrayBuffer | Buffer | Uint8Array | DataView
) => Promise<{ ext: string; mime: string } | undefined>

const mockedFileTypeFromBuffer = (jest.requireMock('file-type') as {
    fileTypeFromBuffer: jest.MockedFunction<FileTypeFromBuffer>
}).fileTypeFromBuffer

// Simula o que o file-type retornaria para cada assinatura binária.
// Quando o tipo reportado já é reconhecido, o file-type nem deve ser chamado.
const PDF_BUFFER = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer
const JPEG_BUFFER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer
const PNG_BUFFER = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer
// Texto sem assinatura binária — file-type retorna undefined.
const TEXTO_BUFFER = new TextEncoder().encode('<html><body>Peca de texto</body></html>').buffer

const mimetypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpeg: 'image/jpeg',
    png: 'image/png',
}

const mockDeteccaoPorAssinatura = () => {
    mockedFileTypeFromBuffer.mockImplementation(async (buf) => {
        const bytes = new Uint8Array(buf as ArrayBuffer)
        const key = bytes.slice(0, 4).join(',')
        switch (key) {
            case '37,80,68,70': return { ext: 'pdf', mime: mimetypes.pdf } as any
            case '255,216,255,224': return { ext: 'jpg', mime: mimetypes.jpeg } as any
            case '137,80,78,71': return { ext: 'png', mime: mimetypes.png } as any
            default: return undefined
        }
    })
}

describe('resolverContentType', () => {
    beforeEach(() => {
        mockedFileTypeFromBuffer.mockReset()
        mockDeteccaoPorAssinatura()
    })

    test('devolve o tipo reportado quando ele e reconhecido (sem charset)', async () => {
        const result = await resolverContentType(PDF_BUFFER, 'application/pdf')
        expect(result).toBe('application/pdf')
        // Tipo reconhecido não aciona detecção por bytes.
        expect(mockedFileTypeFromBuffer).not.toHaveBeenCalled()
    })

    test('normaliza charset UTF-8 antes de checar o tipo reportado', async () => {
        const result = await resolverContentType(TEXTO_BUFFER, 'text/html;charset=UTF-8')
        expect(result).toBe('text/html')
    })

    test('normaliza charset ISO-8859-1 antes de checar o tipo reportado', async () => {
        const result = await resolverContentType(TEXTO_BUFFER, 'text/html;charset=ISO-8859-1')
        expect(result).toBe('text/html')
    })

    test('resgata PDF via deteccao por bytes quando tipo reportado e desconhecido', async () => {
        // Simula o default do Balcaojus (application/octet-stream)
        const result = await resolverContentType(PDF_BUFFER, 'application/octet-stream')
        expect(result).toBe('application/pdf')
        expect(mockedFileTypeFromBuffer).toHaveBeenCalled()
    })

    test('resgata PDF via deteccao por bytes quando tipo reportado esta ausente', async () => {
        const result = await resolverContentType(PDF_BUFFER, undefined)
        expect(result).toBe('application/pdf')
    })

    test('resgata JPEG via deteccao por bytes quando tipo reportado e desconhecido', async () => {
        const result = await resolverContentType(JPEG_BUFFER, 'application/octet-stream')
        expect(result).toBe('image/jpeg')
    })

    test('resgata PNG via deteccao por bytes quando tipo reportado e desconhecido', async () => {
        const result = await resolverContentType(PNG_BUFFER, 'application/octet-stream')
        expect(result).toBe('image/png')
    })

    test('preserva text/html mesmo sem deteccao por bytes (texto nao tem magic number)', async () => {
        // Garante que pecas de texto/HTML continuam funcionando: file-type nao as
        // detecta, entao o tipo reportado e a unica fonte confiavel.
        const result = await resolverContentType(TEXTO_BUFFER, 'text/html')
        expect(result).toBe('text/html')
    })

    test('preserva text/plain mesmo sem deteccao por bytes', async () => {
        const result = await resolverContentType(TEXTO_BUFFER, 'text/plain')
        expect(result).toBe('text/plain')
    })

    test('devolve o tipo reportado quando nem ele nem os bytes casam (para o switch emitir erro)', async () => {
        const result = await resolverContentType(TEXTO_BUFFER, 'application/vnd.unknown')
        expect(result).toBe('application/vnd.unknown')
    })

    test('devolve string vazia quando nao ha tipo reportado e os bytes nao casam', async () => {
        const result = await resolverContentType(TEXTO_BUFFER, undefined)
        expect(result).toBe('')
    })
})
