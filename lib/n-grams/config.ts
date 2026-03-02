// ============================================================================
// CONFIG: Constantes e configurações do sistema de N-Grams
// ============================================================================

/**
 * Tags sempre tratadas como metadados, independente dos atributos.
 * Estas tags definem contexto de documento/página.
 */
export const FIXED_METADATA_TAGS = new Set([
    'library-document',
    'library-attachment',
    'page'
]);

/**
 * Tags block-level que quebram o contexto de citação.
 * Quando encontradas, forçam o fechamento do span atual.
 */
export const BLOCK_TAGS = new Set([
    'p', '/p', 
    'div', '/div', 
    'section', '/section', 
    'article', '/article',
    'h1', '/h1', 'h2', '/h2', 'h3', '/h3', 
    'h4', '/h4', 'h5', '/h5', 'h6', '/h6',
    'table', '/table', 
    'thead', '/thead', 
    'tbody', '/tbody', 
    'tr', '/tr', 
    'li', '/li',
    'ul', '/ul', 
    'ol', '/ol', 
    'br', '/br', 
    'hr', '/hr', 
    'blockquote', '/blockquote'
]);

/**
 * Regex para tokenização do HTML.
 * Captura: tags, palavras, pontuação, espaços e outros caracteres.
 * 
 * Grupos nomeados:
 * - tag: Tags HTML completas (<...>)
 * - word: Palavras (incluindo acentos e hífens)
 * - punct: Pontuação comum
 * - space: Espaços em branco
 * - entity: Entidades HTML (&quot; &amp; &#123; &#xAB; etc)
 * - other: Outros caracteres
 */
export const TOKEN_REGEX = /(?<tag><[^>]+>)|(?<word>[\w\u00C0-\u00FF-]+)|(?<punct>[.,;?!§%\/\(\)"']+)|(?<space>\s+)|(?<entity>&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)|(?<other>[^<>\w\s.,;?!§%-]+)/g;

/**
 * Mapa de entidades HTML comuns para seus caracteres decodificados.
 */
export const HTML_ENTITY_MAP: Record<string, string> = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&nbsp;': ' ',
};

/**
 * Regex para classificar o caractere decodificado de uma entidade HTML.
 */
export const PUNCT_CHARS = /^[.,;?!§%\/\(\)"']+$/;
export const WORD_CHARS = /^[\w\u00C0-\u00FF-]+$/;

/**
 * Valores padrão para o algoritmo
 */
export const DEFAULTS = {
    /** Tamanho mínimo do n-gram para considerar match */
    N_GRAM_SIZE: 8,
    /** Máximo de tokens não-citados entre citações para marcar como "não-citação" */
    MAX_NON_CITATION_HIGHLIGHT: 8,
    /** Tamanho mínimo para tail processing */
    MIN_TAIL_SIZE: 3
} as const;
