import { fileTypeFromBuffer } from 'file-type'
import devLog from '../utils/log'

const htmlDetector = {
	id: 'html', // May be used to recognize the detector in the detector list
	async detect(tokenizer) {
		const htmlHeader = '<!DOCTYPE html '.split('').map(c => c.charCodeAt(0));

		const buffer = new Uint8Array(htmlHeader.length);
		await tokenizer.peekBuffer(buffer, {length: htmlHeader.length, mayBeLess: true});
		if (htmlHeader.every((value, index) => value === buffer[index])) {
			return {ext: 'htm', mime: 'text/html'};
		}

		return undefined;
	}
}

// Opções compartilhadas com todas as chamadas de fileTypeFromBuffer.
// O detector customizado de HTML cobre o caso em que a fonte reporta um tipo
// desconhecido, mas a assinatura é <!DOCTYPE html ...> (file-type nativo não detecta texto).
const detectorOptions = {customDetectors: [htmlDetector]};

// Tipos de conteúdo reconhecidos pelo switch de dispatch (normalizados, sem charset).
// Quando a fonte reporta um tipo fora desta lista, tenta-se inferir pelos bytes (file-type).
export const TIPOS_RECONHECIDOS = new Set([
    'text/plain', 'text/html', 'application/pdf',
    'image/jpeg', 'image/png',
    'audio/x-ms-wma', 'video/x-ms-wmv', 'video/mp4',
])

// Resolve o contentType efetivo a ser usado no dispatch.
// 1. Se a fonte (MNI/PDPJ/Balcaojus) reporta um tipo que o switch sabe tratar, confia nele.
// 2. Caso contrário (ausente ou desconhecido), tenta inferir pelos bytes via file-type.
//    Note que file-type não detecta formatos de texto (text/plain, text/html) por não terem
//    assinatura binária; por isso o tipo reportado é decisivo para esses casos.
// 3. Se nada casar, devolve o tipo reportado para que o switch emita o erro apropriado.
export const resolverContentType = async (buffer: ArrayBuffer, contentTypeReportado?: string): Promise<string> => {
    const normalizado = contentTypeReportado?.replace(/;.*$/, '').trim()

    if (normalizado && TIPOS_RECONHECIDOS.has(normalizado)) {
        return normalizado
    }

    const detectado = await fileTypeFromBuffer(buffer, detectorOptions)
    if (detectado?.mime && TIPOS_RECONHECIDOS.has(detectado.mime)) {
        devLog('resolverContentType: tipo inferido por bytes', detectado.mime, '(reportado:', contentTypeReportado, ')')
        return detectado.mime
    }

    return normalizado || contentTypeReportado || ''
}
