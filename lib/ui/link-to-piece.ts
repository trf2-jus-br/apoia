import { TextoType } from "../ai/prompt-types";
import { DadosDoProcessoType } from "../proc/process-types";

function extractDocumentType(mimeType: string): string {
    const mimeMap: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'application/msword': 'word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'text/plain': 'txt',
        'text/html': 'html',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'application/zip': 'zip',
        'application/x-rar-compressed': 'rar',
    };

    return mimeMap[mimeType] || '';
}

export function addLinkToPieces(html: string, textos: TextoType[], dadosDoProcesso: DadosDoProcessoType): string {
    return html.replace(/([Ee]vento)\s+(\d+)(,\s+\d+º?\s*Grau)?((?:\s*(?:,|e)?\s*[A-Z]+\d+)+)/gm, (match, eventWord, eventNumber, instance, rest) => {
        const eventNum = parseInt(eventNumber);

        // Find all uppercase labels followed by numbers (e.g., EMENDAINIC1, PET1, INIC1)
        const labelRegex = /\b([A-Z]+\d+)\b/g;
        let labelMatch;
        let replacedRest = rest;

        while ((labelMatch = labelRegex.exec(rest)) !== null) {
            const label = labelMatch[1];
            const foundTexto = textos?.find((texto) => {
                const eventFromTexto = texto.event?.match(/^\d+/)?.[0]
                if (!eventFromTexto || eventFromTexto !== String(eventNum)) return false
                if (!texto.event?.startsWith(String(eventNum))) return false
                return texto.label?.toLowerCase() === label.toLowerCase()
            });

            if (foundTexto) {
                // Buscar a peça correspondente para obter o tipoDoConteudo
                const peca = dadosDoProcesso.pecas?.find((p) => p.id === foundTexto.id);
                const mimeType = peca?.tipoDoConteudo || '';
                const documentType = extractDocumentType(mimeType);
                const location = peca.id.match(/([A-Z]+|[A-Z]+\d)_/)[1]
                const uf = location.includes('JF') ? location.slice(-2) : ''
                const is2g = location.includes('TRF') ? true : false


                // const link = `<a href="/api/v1/process/${params.data.numeroDoProcesso}/piece/${foundTexto.id}/binary" target="_blank" title="${foundTexto.label}">${label}</a>`;
                const splited = foundTexto.id.split('_', 2)
                let id = splited[0]
                if (splited.length === 2)
                    id = splited[1]
                const link = `<span class="widgetlinkdocumento" data-idpiece="${foundTexto.id}" data-iddocumento="${id}" data-target="_blank" data-is2g="${is2g}" data-numprocesso="${foundTexto.numeroDoProcesso}" data-mimetype="${documentType}" data-uf="${uf}">${foundTexto.label}</span>`
                //const link = `<span class="cke_widget_wrapper cke_widget_inline cke_widget_widgetlinkdocumento cke_widget_wrapper_widgetlinkdocumento" contenteditable="false" data-cke-filter="off"><span class="widgetlinkdocumento" data-iddocumento="511631026724981731315583503898" data-is2g="false" data-mimetype="pdf" data-numprocesso="50123935320214025104" data-page="" data-target="" data-uf="RJ" data-widget="widgetlinkdocumento">evento 1, INIC1</span></span>`
                replacedRest = replacedRest.replace(label, link);
            }
        }

        return `${eventWord} ${eventNumber}${instance || ''}${replacedRest}`;
    })
}