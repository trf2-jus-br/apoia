// ============================================================================
// FORMATTER: Formatação de contexto para exibição
// ============================================================================

import { SourceContext } from './types';

/**
 * Formata o contexto para exibição no tooltip (atributo title do HTML).
 * 
 * Regras de formatação:
 * 1. Se tem label+event (tag dinâmica): "LABEL (e. EVENTO)"
 * 2. Se tem sourceType: nome amigável do tipo
 * 3. Senão: "Trecho encontrado no prompt"
 * 4. Adiciona título, arquivo e página se disponíveis
 * 
 * @example
 * formatContextToString({ label: 'ACOR1', event: '74, 2º Grau' })
 * // → "ACOR1 (e. 74, 2º GRAU)"
 * 
 * @example
 * formatContextToString({ sourceType: 'library-document', title: 'Manual', pageNumber: '5' })
 * // → "Documento da Biblioteca, Título: Manual, Pág: 5"
 */
export function formatContextToString(ctx?: SourceContext): string {
    if (!ctx) return 'Origem desconhecida';

    const parts: string[] = [];

    // Prioriza label+event para tags dinâmicas
    if (ctx.label && ctx.event) {
        if (ctx.event === '-')
            parts.push(`${ctx.label}`);
        else
            parts.push(`Informação extraída da peça ${ctx.label} (e. ${ctx.event.toUpperCase()})`);
    } else if (ctx.sourceType) {
        parts.push(formatSourceType(ctx.sourceType));
    } else {
        parts.push('Informação extraída do prompt');
    }

    if (ctx.title) parts.push(`Título: ${ctx.title}`);
    if (ctx.filename) parts.push(`Arq: ${ctx.filename}`);
    if (ctx.pageNumber) parts.push(`Pág: ${ctx.pageNumber}`);

    return parts.join(', ');
}

/**
 * Converte o tipo de fonte para um nome amigável
 */
function formatSourceType(sourceType: string): string {
    switch (sourceType) {
        case 'library-document':
            return 'Informação extraída do documento da biblioteca';
        case 'library-attachment':
            return 'Informação extraída de anexo de documento da biblioteca';
        default:
            return `[${sourceType.toUpperCase()}]`;
    }
}
