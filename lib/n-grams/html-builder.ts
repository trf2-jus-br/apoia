// ============================================================================
// HTML-BUILDER: Reconstrução do HTML com spans de citação
// ============================================================================

import { Token, HtmlBuilderState } from './types';
import { isBlockTag } from './tokenizer';
import { formatContextToString } from './formatter';

// ============================================================================
// ESTADO DO BUILDER
// ============================================================================

/**
 * Cria estado inicial do builder
 */
export function createBuilderState(): HtmlBuilderState {
    return {
        outputHtml: '',
        insideCitation: false,
        currentContextString: '',
        hadAnyCitation: false,
        nonCitationBuffer: []
    };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se há próximo token com match e mesmo contexto.
 * Usado para decidir se deve manter o span aberto ou fechá-lo.
 */
export function hasNextMatchWithSameContext(
    tokens: Token[],
    startIndex: number,
    contextStr: string
): boolean {
    for (let j = startIndex + 1; j < tokens.length; j++) {
        const nextToken = tokens[j];
        
        // Ignora whitespace
        if (nextToken.type === 'WHITESPACE') continue;
        
        // Ignora tags inline
        if (nextToken.type === 'TAG' && !isBlockTag(nextToken.content)) continue;
        
        // Tags block quebram a continuidade
        if (nextToken.type === 'TAG' && isBlockTag(nextToken.content)) return false;
        
        // Encontrou token significativo - verifica se tem match com mesmo contexto
        if (nextToken.isMatch) {
            return formatContextToString(nextToken.context) === contextStr;
        }
        
        // Token sem match - não há continuidade
        return false;
    }
    return false;
}

/**
 * Processa o buffer de não-citação acumulado.
 * 
 * Marca como "não-citação" apenas se:
 * 1. Já houve uma citação antes
 * 2. Vai haver uma citação depois
 * 3. O número de tokens significativos está dentro do threshold
 */
export function flushNonCitationBuffer(
    state: HtmlBuilderState,
    isBeforeCitation: boolean,
    maxNonCitationHighlight: number
): void {
    if (state.nonCitationBuffer.length === 0) return;
    
    const significantCount = state.nonCitationBuffer.filter(t => 
        t.type === 'WORD' || t.type === 'PUNCTUATION'
    ).length;
    
    const shouldMark = state.hadAnyCitation && 
                       isBeforeCitation && 
                       maxNonCitationHighlight > 0 && 
                       significantCount > 0 && 
                       significantCount <= maxNonCitationHighlight;
    
    if (shouldMark) {
        state.outputHtml += '<span class="nao-citacao" title="Trecho destacado para indicar que não é uma citação, mas está entre citações">';
    }
    
    for (const t of state.nonCitationBuffer) {
        state.outputHtml += t.content;
    }
    
    if (shouldMark) {
        state.outputHtml += '</span>';
    }
    
    state.nonCitationBuffer = [];
}

// ============================================================================
// HANDLERS DE TOKENS
// ============================================================================

/**
 * Extrai tags inline do início do buffer de não-citação.
 * Retorna as tags inline que devem ser incluídas dentro do span.
 * 
 * Isso resolve o problema de tags como <b> no início da frase ficarem
 * fora do span de citação.
 */
function extractLeadingInlineTags(state: HtmlBuilderState): Token[] {
    const inlineTags: Token[] = [];
    
    // Extrai tags inline consecutivas do início do buffer
    while (state.nonCitationBuffer.length > 0) {
        const first = state.nonCitationBuffer[0];
        
        // Se for uma tag inline, extrai
        if (first.type === 'TAG' && !isBlockTag(first.content)) {
            inlineTags.push(state.nonCitationBuffer.shift()!);
        } else {
            // Se não for tag inline, para de extrair
            break;
        }
    }
    
    return inlineTags;
}

/**
 * Processa token com match (citação)
 */
export function handleMatchedToken(
    token: Token,
    state: HtmlBuilderState,
    maxNonCitationHighlight: number
): void {
    // CORREÇÃO: Extrair tags inline do início do buffer ANTES do flush
    // Isso garante que tags como <b> no início da frase fiquem DENTRO do span
    const leadingInlineTags = extractLeadingInlineTags(state);
    
    flushNonCitationBuffer(state, true, maxNonCitationHighlight);
    state.hadAnyCitation = true;
    
    const tokenContextStr = formatContextToString(token.context);
    const shouldBreakForBlock = token.startsAfterBlockTag && state.insideCitation;
    
    if (!state.insideCitation) {
        // Abre novo span de citação
        state.outputHtml += `<span class="citacao" title="${tokenContextStr}">`;
        
        // Adiciona as tags inline extraídas DENTRO do span
        for (const tag of leadingInlineTags) {
            state.outputHtml += tag.content;
        }
        
        state.insideCitation = true;
        state.currentContextString = tokenContextStr;
    } else if (shouldBreakForBlock || tokenContextStr !== state.currentContextString) {
        // Fecha span atual e abre novo (contexto mudou ou block boundary)
        state.outputHtml += '</span>';
        state.outputHtml += `<span class="citacao" title="${tokenContextStr}">`;
        
        // Adiciona as tags inline extraídas DENTRO do novo span
        for (const tag of leadingInlineTags) {
            state.outputHtml += tag.content;
        }
        
        state.currentContextString = tokenContextStr;
    } else {
        // Span já aberto com mesmo contexto - adiciona tags inline normalmente
        for (const tag of leadingInlineTags) {
            state.outputHtml += tag.content;
        }
    }
    
    state.outputHtml += token.content;
}

/**
 * Processa token de whitespace
 */
export function handleWhitespaceToken(
    token: Token,
    index: number,
    tokens: Token[],
    state: HtmlBuilderState
): void {
    if (state.insideCitation && hasNextMatchWithSameContext(tokens, index, state.currentContextString)) {
        // Mantém whitespace dentro do span se próximo token continua a citação
        state.outputHtml += token.content;
    } else if (state.insideCitation) {
        // Fecha span e adiciona whitespace ao buffer
        state.outputHtml += '</span>';
        state.insideCitation = false;
        state.currentContextString = '';
        state.nonCitationBuffer.push(token);
    } else {
        state.nonCitationBuffer.push(token);
    }
}

/**
 * Processa token de tag HTML
 */
export function handleTagToken(
    token: Token,
    index: number,
    tokens: Token[],
    state: HtmlBuilderState,
    maxNonCitationHighlight: number
): void {
    if (isBlockTag(token.content)) {
        // Tags block-level fecham o span
        if (state.insideCitation) {
            state.outputHtml += `</span>${token.content}`;
            state.insideCitation = false;
            state.currentContextString = '';
            flushNonCitationBuffer(state, false, maxNonCitationHighlight);
            
            // Verifica se deve reabrir o span
            if (hasNextMatchWithSameContext(tokens, index, state.currentContextString)) {
                state.outputHtml += `<span class="citacao" title="${state.currentContextString}">`;
                state.insideCitation = true;
            }
        } else {
            flushNonCitationBuffer(state, false, maxNonCitationHighlight);
            state.outputHtml += token.content;
        }
    } else {
        // Tags inline mantêm dentro do span ou vão para o buffer
        if (state.insideCitation) {
            state.outputHtml += token.content;
        } else {
            state.nonCitationBuffer.push(token);
        }
    }
}

/**
 * Processa token de pontuação ou outros
 */
export function handleOtherToken(token: Token, state: HtmlBuilderState): void {
    if (state.insideCitation) {
        state.outputHtml += token.content;
    } else {
        state.nonCitationBuffer.push(token);
    }
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Reconstrói o HTML com spans de citação e tooltips.
 * 
 * Percorre os tokens marcados e:
 * 1. Agrupa tokens consecutivos com isMatch=true e mesmo contexto em spans
 * 2. Adiciona tooltips (title) com informação de origem
 * 3. Opcionalmente marca trechos não-citados entre citações
 * 
 * @param genTokens - Tokens do texto gerado (já com isMatch marcado)
 * @param maxNonCitationHighlight - Threshold para marcar não-citações
 * @returns HTML reconstruído com spans de citação
 */
export function rebuildHtmlWithTooltips(genTokens: Token[], maxNonCitationHighlight: number = 0): string {
    const state = createBuilderState();
    
    for (let i = 0; i < genTokens.length; i++) {
        const token = genTokens[i];
        
        if (token.isMatch) {
            handleMatchedToken(token, state, maxNonCitationHighlight);
        } else if (token.type === 'WHITESPACE') {
            handleWhitespaceToken(token, i, genTokens, state);
        } else if (token.type === 'TAG') {
            handleTagToken(token, i, genTokens, state, maxNonCitationHighlight);
        } else {
            handleOtherToken(token, state);
        }
    }
    
    // Fecha span se ainda estiver aberto
    if (state.insideCitation) {
        state.outputHtml += '</span>';
    }
    
    // Processa buffer restante
    flushNonCitationBuffer(state, false, maxNonCitationHighlight);
    
    // Remove spans vazios que possam ter sido criados
    return state.outputHtml.replace(/<span class="(citacao|nao-citacao)"[^>]*><\/span>/g, '');
}
