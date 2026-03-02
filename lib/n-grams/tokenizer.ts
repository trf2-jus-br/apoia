// ============================================================================
// TOKENIZER: Tokenização de HTML com extração de contexto
// ============================================================================

import { Token, SourceContext, ProcessTagResult } from './types';
import { FIXED_METADATA_TAGS, BLOCK_TAGS, TOKEN_REGEX, HTML_ENTITY_MAP, PUNCT_CHARS, WORD_CHARS } from './config';

// ============================================================================
// DECODIFICAÇÃO DE ENTIDADES HTML
// ============================================================================

/**
 * Decodifica uma entidade HTML para seu caractere correspondente.
 * Suporta entidades nomeadas comuns e entidades numéricas (decimal e hex).
 * @example decodeHtmlEntity('&quot;') → '"'
 * @example decodeHtmlEntity('&#39;') → "'"
 * @example decodeHtmlEntity('&#x27;') → "'"
 */
export function decodeHtmlEntity(entity: string): string {
    const lower = entity.toLowerCase();
    if (HTML_ENTITY_MAP[lower]) return HTML_ENTITY_MAP[lower];

    // Entidade numérica hexadecimal: &#xNN;
    if (lower.startsWith('&#x')) {
        return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
    }
    // Entidade numérica decimal: &#NN;
    if (lower.startsWith('&#')) {
        return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
    }

    return entity; // Entidade desconhecida, retorna como está
}

// ============================================================================
// PARSING DE TAGS HTML
// ============================================================================

/**
 * Extrai o nome de uma tag HTML.
 * @example getTagName('<div class="x">') → 'div'
 * @example getTagName('</p>') → 'p'
 */
export function getTagName(tagStr: string): string {
    const match = tagStr.match(/<\/?([a-zA-Z0-9-]+)/);
    return match ? match[1].toLowerCase() : '';
}

/**
 * Extrai atributos de uma tag HTML como Record.
 * Normaliza 'number' para 'pageNumber'.
 * @example parseAttributes('<page number="5">') → { pageNumber: '5' }
 */
export function parseAttributes(tagStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9-]+)=["']([^"']*)["']/g;

    let match;
    while ((match = attrRegex.exec(tagStr)) !== null) {
        let key = match[1].toLowerCase();
        const value = match[2];
        
        // Normaliza 'number' para 'pageNumber'
        if (key === 'number') key = 'pageNumber';
        attrs[key] = value;
    }
    return attrs;
}

/**
 * Verifica se uma tag é de metadados.
 * Uma tag é metadado se:
 * 1. É uma tag fixa (library-document, library-attachment, page), OU
 * 2. Tem ambos os atributos 'event' E 'label' (tag dinâmica)
 */
export function isMetadataTag(tagName: string, attrs: Record<string, string>): boolean {
    const isFixed = FIXED_METADATA_TAGS.has(tagName);
    const isDynamic = Boolean(attrs['event'] && attrs['label']);
    return isFixed || isDynamic;
}

/**
 * Verifica se uma tag é block-level (quebra contexto de citação)
 */
export function isBlockTag(tagContent: string): boolean {
    return BLOCK_TAGS.has(getTagName(tagContent));
}

// ============================================================================
// GERENCIAMENTO DE CONTEXTO
// ============================================================================

/**
 * Cria um novo contexto baseado na tag de metadados.
 * - <page> apenas atualiza pageNumber, mantém o resto
 * - Outras tags criam novo contexto
 * - library-attachment herda title do pai se não tiver próprio
 */
export function createContextForTag(
    tagName: string,
    attrs: Record<string, string>,
    parentCtx: SourceContext
): SourceContext {
    if (tagName === 'page') {
        // <page> apenas atualiza pageNumber, mantém o resto
        return { ...parentCtx, pageNumber: attrs['pageNumber'] };
    }
    
    // Outras tags criam novo contexto
    const newCtx: SourceContext = {
        sourceType: tagName,
        ...attrs
    };
    
    // library-attachment herda title do pai se não tiver próprio
    if (tagName === 'library-attachment' && !newCtx.title && parentCtx.title) {
        newCtx.title = parentCtx.title;
    }
    
    return newCtx;
}

/**
 * Processa uma tag durante a tokenização, gerenciando a pilha de contextos.
 * Retorna se a tag deve ser ignorada (é metadado) e o novo contexto.
 */
export function processTagToken(
    tagContent: string,
    extractMetadata: boolean,
    currentCtx: SourceContext,
    contextStack: SourceContext[],
    openMetadataTags: Set<string>
): ProcessTagResult {
    if (!extractMetadata) {
        return { skipToken: false, newContext: currentCtx };
    }

    const tagName = getTagName(tagContent);
    const isClosing = tagContent.startsWith('</');

    if (!isClosing) {
        // TAG DE ABERTURA
        const attrs = parseAttributes(tagContent);
        
        if (isMetadataTag(tagName, attrs)) {
            openMetadataTags.add(tagName);
            contextStack.push({ ...currentCtx });
            
            const newContext = createContextForTag(tagName, attrs, currentCtx);
            return { skipToken: true, newContext };
        }
    } else {
        // TAG DE FECHAMENTO
        if (openMetadataTags.has(tagName)) {
            openMetadataTags.delete(tagName);
            const restoredContext = contextStack.pop() ?? {};
            return { skipToken: true, newContext: restoredContext };
        }
    }

    return { skipToken: false, newContext: currentCtx };
}

// ============================================================================
// TOKENIZAÇÃO PRINCIPAL
// ============================================================================

/**
 * Tokeniza HTML e extrai contexto de metadados.
 * 
 * Mantém uma pilha de contextos para tags aninhadas, permitindo
 * que cada token tenha informação sobre sua origem (documento, página, etc.)
 * 
 * @param html - HTML a ser tokenizado
 * @param extractMetadata - Se true, extrai contexto de tags de metadados
 * @returns Array de tokens com contexto
 */
export function tokenizeWithContext(html: string, extractMetadata: boolean = true): Token[] {
    const tokens: Token[] = [];
    let currentCtx: SourceContext = {};
    const contextStack: SourceContext[] = [];
    const openMetadataTags = new Set<string>();
    let justSawBlockTag = false;

    // Reset regex state (importante para reuso da regex global)
    TOKEN_REGEX.lastIndex = 0;

    let match;
    while ((match = TOKEN_REGEX.exec(html)) !== null) {
        const fullMatch = match[0];
        const { tag, word, punct, space, entity } = match.groups!;

        if (tag) {
            const processed = processTagToken(
                tag, extractMetadata, currentCtx, contextStack, openMetadataTags
            );
            
            if (processed.skipToken) {
                currentCtx = processed.newContext;
                continue;
            }
            
            currentCtx = processed.newContext;
            tokens.push({ type: 'TAG', content: fullMatch });
            
            if (isBlockTag(fullMatch)) {
                justSawBlockTag = true;
            }
        } else if (word) {
            tokens.push({
                type: 'WORD',
                content: fullMatch,
                normalized: fullMatch.toLowerCase(),
                context: { ...currentCtx },
                startsAfterBlockTag: justSawBlockTag
            });
            justSawBlockTag = false;
        } else if (punct) {
            tokens.push({
                type: 'PUNCTUATION',
                content: fullMatch,
                normalized: fullMatch,
                context: { ...currentCtx },
                startsAfterBlockTag: justSawBlockTag
            });
            justSawBlockTag = false;
        } else if (entity) {
            // Entidade HTML: decodifica e classifica pelo caractere resultante
            const decoded = decodeHtmlEntity(fullMatch);

            if (PUNCT_CHARS.test(decoded)) {
                tokens.push({
                    type: 'PUNCTUATION',
                    content: fullMatch,
                    normalized: decoded,
                    context: { ...currentCtx },
                    startsAfterBlockTag: justSawBlockTag
                });
                justSawBlockTag = false;
            } else if (WORD_CHARS.test(decoded)) {
                tokens.push({
                    type: 'WORD',
                    content: fullMatch,
                    normalized: decoded.toLowerCase(),
                    context: { ...currentCtx },
                    startsAfterBlockTag: justSawBlockTag
                });
                justSawBlockTag = false;
            } else if (/\s/.test(decoded)) {
                tokens.push({ type: 'WHITESPACE', content: fullMatch });
            } else {
                // Símbolo ou caractere especial — preserva como não-significativo
                tokens.push({ type: 'TAG', content: fullMatch });
            }
        } else if (space) {
            tokens.push({ type: 'WHITESPACE', content: fullMatch });
        } else {
            // Outros caracteres (símbolos, etc)
            tokens.push({ type: 'TAG', content: fullMatch });
        }
    }

    return tokens;
}
