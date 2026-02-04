// ============================================================================
// TYPES: Interfaces e tipos para o sistema de N-Grams
// ============================================================================

/**
 * Contexto de origem de um trecho de texto.
 * Representa de onde veio uma citação (documento, página, etc.)
 */
export interface SourceContext {
    /** Tipo da tag de origem (ex: 'acordao', 'library-document', 'page') */
    sourceType?: string;
    /** Título do documento */
    title?: string;
    /** Nome do arquivo */
    filename?: string;
    /** Número da página */
    pageNumber?: string;
    /** Evento associado (para tags dinâmicas) */
    event?: string;
    /** Label/rótulo (para tags dinâmicas) */
    label?: string;
    /** ID do documento */
    id?: string;
    /** Permite outros atributos dinâmicos */
    [key: string]: string | undefined;
}

/**
 * Tipos possíveis de token durante a tokenização
 */
export type TokenType = 'TAG' | 'WORD' | 'PUNCTUATION' | 'WHITESPACE';

/**
 * Token resultante da tokenização do HTML.
 * Representa uma unidade atômica do texto (palavra, pontuação, tag, etc.)
 */
export interface Token {
    /** Tipo do token */
    type: TokenType;
    /** Conteúdo original do token */
    content: string;
    /** Versão normalizada (lowercase) para comparação */
    normalized?: string;
    /** Indica se este token foi encontrado no source (é uma citação) */
    isMatch?: boolean;
    /** Contexto de origem (documento/página de onde veio) */
    context?: SourceContext;
    /** Indica se este token vem logo após uma tag de bloco no source */
    startsAfterBlockTag?: boolean;
}

/**
 * Token com índice original preservado.
 * Usado durante o matching para mapear de volta ao array original.
 */
export interface IndexedToken extends Token {
    /** Índice do token no array original */
    originalIndex: number;
}

/**
 * Resultado do processamento de uma tag durante tokenização
 */
export interface ProcessTagResult {
    /** Se true, a tag não gera token visual (é metadado) */
    skipToken: boolean;
    /** Novo contexto após processar a tag */
    newContext: SourceContext;
}

/**
 * Resultado de um match encontrado
 */
export interface MatchResult {
    /** Posição inicial no source */
    sourceStart: number;
    /** Tamanho do match em tokens */
    length: number;
}

/**
 * Estado do builder durante a reconstrução do HTML
 */
export interface HtmlBuilderState {
    /** HTML de saída sendo construído */
    outputHtml: string;
    /** Se estamos dentro de um span de citação */
    insideCitation: boolean;
    /** String do contexto atual (para agrupar spans) */
    currentContextString: string;
    /** Se já houve alguma citação no texto */
    hadAnyCitation: boolean;
    /** Se houve uma tag block desde a última citação (quebra de continuidade) */
    hadBlockSinceLastCitation: boolean;
    /** Buffer de tokens não-citados sendo acumulados */
    nonCitationBuffer: Token[];
}
