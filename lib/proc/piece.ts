'use server'

import { pdfToText } from '../pdf/pdf'
import { html2md } from '../utils/html2md'
import { T } from './combinacoes'
import { addBlockQuote } from '../utils/utils'
import { Dao } from '../db/mysql'
import { IADocument, IADocumentContentSource } from '../db/mysql-types'

import pLimit from 'p-limit'
import { assertNivelDeSigilo, verificarNivelDeSigilo } from './sigilo'
import { Interop } from '../interop/interop'
import { envString } from '../utils/env'
import { PecaConteudoType } from './process-types'
import { TEXTO_PECA_IMAGEM_JPEG, TEXTO_PECA_IMAGEM_PNG, TEXTO_PECA_PDF_OCR_ERRO, TEXTO_PECA_PDF_OCR_VAZIO, TEXTO_PECA_VIDEO_MP4, TEXTO_PECA_VIDEO_XMS_WMV } from './process-types'

const limit = pLimit(envString('OCR_LIMIT') ? parseInt(envString('OCR_LIMIT')) : 1)

const obterTextoSimples = async (buffer: ArrayBuffer, documentId: number) => {
    const decoder = new TextDecoder('utf-8')
    const texto = decoder.decode(buffer)
    Dao.updateDocumentContent(documentId, 1, texto)
    return texto
}

const obterTextoDeHtml = async (buffer: ArrayBuffer, documentId: number) => {
    const decoder = new TextDecoder('iso-8859-1')
    const html = decoder.decode(buffer)
    const htmlWithBlockQuote = addBlockQuote(html)
    const texto = await html2md(htmlWithBlockQuote)
    Dao.updateDocumentContent(documentId, 1, texto)
    return texto
}

const obterPaginasECaracteres = (texto) => {
    const pages = texto.replace(/<page number="\d+">\n/, '').split('</page>')
    pages.pop()
    const chars = pages.reduce((acc, p) => acc + p.length, 0)
    return { pages, chars }
}

export const ocrPdf = async (buffer: ArrayBuffer, documentId: number) =>
    limit(() => ocrPdfSemLimite(buffer, documentId))

// Método que recebe um buffer de um PDF, faz um post http para o serviço de OCR e retorna o PDF processado pelo OCR
const ocrPdfSemLimite = async (buffer: ArrayBuffer, documentId: number) => {
    if (envString('OCR_URL')) {
        console.log('ocrPdf', buffer.byteLength)
        const url = envString('OCR_URL') as string
        const formData = new FormData()
        const file = new Blob([buffer], { type: 'application/pdf' })
        formData.append('file', file)
        const res = await fetch(url, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(1800000), // 30 minutes timeout
        })
        if (res.status !== 200) {
            if (res.headers.get('content-type') === 'application/json') {
                const errorMsg = (await res.json()).error
                throw new Error(`Erro ao processar documento ${documentId} pelo OCR: ${errorMsg}`)
            }
            throw new Error(`Erro ao processar documento ${documentId} pelo OCR`)
        }
        return await res.arrayBuffer()
    }
    if (envString('TIKA_URL')) {
        console.log('tikaPdf', buffer.byteLength)
        const url = envString('TIKA_URL') as string
        const res = await fetch(url, {
            method: 'PUT',
            body: new Uint8Array(buffer),
            headers: {
            'Content-Type': 'application/pdf',
            'Accept': 'text/plain',
            'X-Tika-PDFocrStrategy': 'AUTO',
            'X-Tika-OCRLanguage': 'por'
            },
            signal: AbortSignal.timeout(1800000), // 30 minutes timeout
        })
        if (res.status !== 200) {
            if (res.headers.get('content-type') === 'application/json') {
                const errorMsg = (await res.json()).error
                throw new Error(`Erro ao processar documento ${documentId} pelo Tika: ${errorMsg}`)
            }
            throw new Error(`Erro ao processar documento ${documentId} pelo Tika`)
        }
        return await res.arrayBuffer()
    }
}

const atualizarConteudoDeDocumento = async (documentId: number, contentSource: number, content: string) => {
    Dao.updateDocumentContent(documentId, contentSource, content)
    return content
}

const obterTextoDePdf = async (buffer: ArrayBuffer, documentId: number) => {
    const bufferCopy = buffer.slice(0);
    const texto = await pdfToText(buffer, {})
    const { pages, chars } = obterPaginasECaracteres(texto)

    // PDF tem texto suficiente para se considerar que não será necessário realizar o OCR
    if (chars / pages.length > 500 || (!envString('OCR_URL') && !envString('TIKA_URL'))) {
        return atualizarConteudoDeDocumento(documentId, IADocumentContentSource.PDF, texto)
    }

    let ocrBuffer
    try {
        ocrBuffer = await ocrPdf(bufferCopy, documentId)
    } catch (error) {
        console.warn(`Erro ao processar OCR para o documento ${documentId}:`, error)
        return atualizarConteudoDeDocumento(documentId, IADocumentContentSource.OCR_ERRO, TEXTO_PECA_PDF_OCR_ERRO)
    }
    const ocrTexto = await pdfToText(ocrBuffer, {})
    const { pages: ocrPages, chars: ocrChars } = obterPaginasECaracteres(ocrTexto)

    // PDF processado pelo OCR tem mais texto que o original
    if (ocrChars) {
        return atualizarConteudoDeDocumento(documentId, IADocumentContentSource.OCR, ocrTexto)
    } else if (chars) {
        return atualizarConteudoDeDocumento(documentId, IADocumentContentSource.PDF, texto)
    }
    if (!ocrTexto || ocrTexto.trim().length < 500) {
        console.warn(`OCR não retornou texto para o documento ${documentId}. Considerando como OCR_VAZIO.`)
        return atualizarConteudoDeDocumento(documentId, IADocumentContentSource.OCR_VAZIO, TEXTO_PECA_PDF_OCR_VAZIO)
    }
    return undefined
}

const obterTipoDePecaPelaDescricao = (descr: string) => {
    for (const tipo in T) {
        if (descr === T[tipo]) {
            return tipo
        }
    }
    return null
}

export const obterDocumentoGravado = async (dossier_id: number, numeroDoProcesso: string, idDaPeca: string, descrDaPeca: string): Promise<IADocument> => {
    const document_id = await Dao.assertIADocumentId(dossier_id, idDaPeca, descrDaPeca)

    // verificar se a peça já foi gravada no banco
    const document = await Dao.retrieveDocument(document_id)
    // if (!document) throw new Error(`Documento ${idDaPeca} não encontrado`)
    return document
}


export const obterConteudoDaPeca = async (dossier_id: number, numeroDoProcesso: string, idDaPeca: string, descrDaPeca: string, sigiloDaPeca: string, interop: Interop): Promise<PecaConteudoType> => {
    try {
        if (verificarNivelDeSigilo())
            assertNivelDeSigilo(sigiloDaPeca, `${descrDaPeca} (${idDaPeca})`)

        const document = await obterDocumentoGravado(dossier_id, numeroDoProcesso, idDaPeca, descrDaPeca)
        const document_id = document ? document.id : undefined

        if (document && document.content) {
            console.log('Retrieving from cache, content of type', document.content_source_id)
            return { conteudo: document.content }
        }

        const { buffer, contentType } = await interop.obterPeca(numeroDoProcesso, idDaPeca)

        switch (contentType.replace(/;.*$/, '')) {
            case 'text/plain':
                return { conteudo: await obterTextoSimples(buffer, document_id) }
            case 'text/html':
            case 'text/html;charset=ISO-8859-1':
            case 'text/html;charset=UTF-8':
                return { conteudo: await obterTextoDeHtml(buffer, document_id) }
            case 'application/pdf':
                return { conteudo: await obterTextoDePdf(buffer, document_id) }
            case 'image/jpeg':
                return { conteudo: await atualizarConteudoDeDocumento(document_id, IADocumentContentSource.IMAGE, TEXTO_PECA_IMAGEM_JPEG) }
            case 'image/png':
                return { conteudo: await atualizarConteudoDeDocumento(document_id, IADocumentContentSource.IMAGE, TEXTO_PECA_IMAGEM_PNG) }
            case 'video/x-ms-wmv':
                return { conteudo: await atualizarConteudoDeDocumento(document_id, IADocumentContentSource.VIDEO, TEXTO_PECA_VIDEO_XMS_WMV) }
            case 'video/mp4':
                return { conteudo: await atualizarConteudoDeDocumento(document_id, IADocumentContentSource.VIDEO, TEXTO_PECA_VIDEO_MP4) }
            default:
                throw new Error(`Peça ${idDaPeca} (${descrDaPeca}) - Tipo de conteúdo não suportado: ${contentType}`)
        }
    } catch (error) {
        console.log(`Erro ao obter conteúdo da peça ${idDaPeca} (${descrDaPeca}):`, error)
        return { conteudo: undefined, errorMsg: error }
    }
}


